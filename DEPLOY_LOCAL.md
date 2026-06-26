# Déploiement local — Présentation du projet

> **Contexte** : ce guide explique comment lancer Medicare31 sur un PC
> Windows (ton IdeaPad 3 par exemple) pour une **présentation ponctuelle**
> devant un jury ou des testeurs. Pas de serveur distant, pas de coût
> d'hébergement : tout tourne dans Docker sur ta machine.

---

## 1. Prérequis

### Matériel
- PC avec **8 Go de RAM minimum** (IdeaPad 3 OK)
- **Connexion Internet** (pour que le backend puisse joindre Brevo)
- *(Recommandé)* Câble Ethernet + adaptateur USB-C→RJ45 — évite les coupures WiFi

### Logiciels
- **Windows 10/11** avec **Docker Desktop** installé et démarré
  - Télécharger : https://www.docker.com/products/docker-desktop/
  - Vérifier : ouvrir un terminal `cmd` et taper `docker --version`
- **Git** : https://git-scm.com/download/win
- *(Optionnel)* **ngrok** pour partager sur Internet : https://ngrok.com/

---

## 2. Récupération du code

```powershell
# Dans un terminal, choisir un dossier de travail
cd C:\Users\<ton-user>\Documents

# Cloner le repo
git clone https://github.com/MalikIssiakhem/Medicare31.git
cd Medicare31

# Basculer sur la branche stable
git checkout fix/junior
```

---

## 3. Configuration SMTP

Tu as **deux modes** au choix :

### Mode A — MailHog (le plus sûr pour une démo)

Les emails sont **capturés dans une interface web** sur `http://localhost:8025`.
Rien ne sort sur Internet, aucun risque de panne réseau le jour J.

```env
# Contenu du fichier .env à la racine du projet :
smtp_host=mailhog
smtp_port=1025
smtp_from=noreply@medicare31.fr
smtp_user=
smtp_password=
smtp_use_tls=false
```

**Avantage** : 100% offline, le jury voit immédiatement les emails sur
`localhost:8025`, aucun risque de rate-limit ou de panne Brevo.

### Mode B — Brevo (envoi réel, impressionnant)

Les emails sont **réellement envoyés** sur la boîte mail du destinataire
(Gmail, Outlook, etc.). Nécessite Internet et un compte Brevo configuré.

```env
# Contenu du fichier .env à la racine du projet :
smtp_host=smtp-relay.brevo.com
smtp_port=587
smtp_from=hassane.junior@gmail.com       # ton adresse réelle
smtp_user=<login>@smtp-brevo.com         # fourni par Brevo
smtp_password=xsmtpsib-xxxxxxxxxxxxx      # clé SMTP de Brevo
smtp_use_tls=true
```

⚠️ **Important** : sans nom de domaine vérifié sur Brevo, l'expéditeur
visible par le destinataire sera `noreply@brevo.com` (pas ton adresse).
C'est normal, l'email arrivera quand même.

**Comment récupérer tes credentials Brevo** :
1. Aller sur https://app.brevo.com
2. Se connecter
3. Menu **Settings → SMTP & API → SMTP Tokens**
4. Copier le **Login** (souvent `xxx@smtp-brevo.com`)
5. Générer une nouvelle clé si besoin, copier la **valeur** (commence par `xsmtpsib-`)

### Création du fichier `.env`

À la racine du projet (là où il y a `docker-compose.yml`) :

**En PowerShell** :
```powershell
Copy-Item .env.example .env -Force
notepad .env
# Modifier les valeurs SMTP, sauvegarder, fermer
```

**En bash (Git Bash / WSL)** :
```bash
cp .env.example .env
nano .env  # ou code .env si VS Code est installé
```

---

## 4. Démarrage

```powershell
# Construire les images et démarrer tous les services en arrière-plan
docker compose up -d --build
```

Attendre **30 secondes** que tous les services soient `Up`. Vérifier :

```powershell
docker compose ps
```

Résultat attendu :
```
NAME                    STATUS              PORTS
medicare31-nginx-1      Up                  0.0.0.0:80->80/tcp
medicare31-backend-1    Up                  8000/tcp
medicare31-db-1         Up (healthy)        5432/tcp
medicare31-frontend-1   Up                  80/tcp
medicare31-mailhog-1    Up                  0.0.0.0:8025->8025/tcp
```

Si un service est en `Restarting`, voir les logs :

```powershell
docker compose logs backend --tail=30
```

---

## 5. Vérification que tout marche

### 5.1 — API Health check

Ouvrir dans un navigateur : **http://localhost/api/health**

Réponse attendue : `{"status":"ok","service":"Medicare31 API"}`

### 5.2 — SMTP Health check (le truc visuel devant le jury)

Ouvrir : **http://localhost/api/health/smtp**

En **mode dev (MailHog)** :
```json
{
  "configured": true,
  "reachable": true,
  "host": "mailhog",
  "port": 1025,
  "ehlo_code": 250,
  "user_configured": false
}
```

En **mode prod (Brevo)** :
```json
{
  "configured": true,
  "reachable": true,
  "host": "smtp-relay.brevo.com",
  "port": 587,
  "ehlo_code": 250,
  "user_configured": true
}
```

### 5.3 — Diagnostic SMTP complet

Dans un terminal :

```powershell
docker compose exec backend python scripts/diagnose_smtp.py
```

Résultat attendu : **4 étapes ✅**.

### 5.4 — Test d'envoi d'un email

#### Mode A (MailHog)
1. Aller sur http://localhost/register
2. Remplir avec un email bidon : `test@demo.fr`
3. Cliquer **S'inscrire**
4. Aller sur http://localhost:8025 → l'email est là ✅

#### Mode B (Brevo)
1. Aller sur http://localhost/register
2. Remplir avec **ton VRAI email** : `ton.email@gmail.com`
3. Cliquer **S'inscrire**
4. Vérifier ta boîte mail (Gmail, Outlook…) → email de vérification ✅

---

## 6. Scénarios de présentation

### Scénario A — Sur le laptop lui-même

Le jury regarde l'écran de ton PC pendant que tu navigues.

- URL à ouvrir : `http://localhost`
- Tu as juste besoin du laptop et de Docker qui tourne
- Aucun accès réseau à configurer

### Scénario B — Sur le réseau local (jury sur son propre PC)

Le jury veut tester depuis son propre PC ou téléphone, connecté au même WiFi.

**Étape 1 — Trouver ton IP locale** :

```powershell
ipconfig
# Chercher "Adresse IPv4" sous WiFi : souvent 192.168.1.XX
```

**Étape 2 — Ouvrir le port 80 dans le pare-feu Windows** :

Ouvrir **PowerShell en administrateur** et exécuter :

```powershell
New-NetFirewallRule -DisplayName "Medicare31 HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
```

**Étape 3 — Donner l'URL au jury** :

```
http://192.168.1.XX
```

⚠️ Le jury doit être connecté **au même réseau WiFi** que toi.

### Scénario C — Sur Internet (sans WiFi commun)

Tu veux partager l'app avec quelqu'un à distance, sans qu'il se connecte à ton WiFi.

**Étape 1 — Installer ngrok** : https://ngrok.com/download
Créer un compte gratuit, copier ton **authtoken**, puis :

```powershell
ngrok config add-authtoken <ton-token>
```

**Étape 2 — Exposer le port 80** :

```powershell
ngrok http 80
```

ngrok affiche une URL publique temporaire, par exemple :

```
https://a1b2c3d4.ngrok-free.app
```

**Tu as 2h gratuites** par session ngrok. Pour un démo, c'est largement suffisant.

⚠️ Cette URL est publique : **n'importe qui peut y accéder**.
N'active ce mode que le temps de la présentation.

---

## 7. Logs en direct pendant la présentation

Pour montrer au jury ce qui se passe sous le capot :

```powershell
# Dans un terminal à part
docker compose logs -f backend
```

Tu verras s'afficher en temps réel :

```
[INFO] app.startup: Logging configuré (niveau=INFO)
[INFO] app.smtp: SMTP configuré : host=mailhog port=1025 user=(vide) tls=False
[INFO] app.services.email: 📧 Envoi d'un email à test@demo.fr via mailhog:1025
[INFO] app.services.email: ✅ Email envoyé avec succès à test@demo.fr
```

C'est très impressionnant devant un jury : *"voyez, le système logge chaque action"*.

---

## 8. Arrêter proprement après la présentation

```powershell
# Arrêter tous les services
docker compose down

# Supprimer aussi la base de données (pour repartir de zéro)
docker compose down -v
```

---

## 9. Dépannage rapide

### "Port 80 already in use"

Un autre service utilise le port 80 (souvent IIS sur Windows, ou Skype).
Solution : changer le port dans `docker-compose.yml` :

```yaml
nginx:
  ports:
    - "8080:80"    # ← utiliser 8080 au lieu de 80
```

Puis accéder à `http://localhost:8080`.

### "Cannot connect to Docker daemon"

Docker Desktop n'est pas démarré. Lancer Docker Desktop depuis le menu Démarrer,
attendre que l'icône en bas à droite passe au vert, puis réessayer.

### "Backend Restarting"

```powershell
docker compose logs backend --tail=50
```

Chercher l'erreur. Souvent :
- Mauvais mot de passe dans `.env`
- DB pas encore prête (attendre 30s et `docker compose restart backend`)

### "Email n'arrive pas sur ma boîte (mode Brevo)"

1. Vérifier les spams / courrier indésirable
2. Lancer `docker compose exec backend python scripts/diagnose_smtp.py`
3. Vérifier que Brevo n'a pas suspendu le compte :
   https://app.brevo.com → Settings → SMTP & API → Activity

### Le PC est lent pendant la présentation

- Fermer Chrome / onglets inutiles
- Vérifier que Docker ne mange pas toute la RAM :
  Docker Desktop → Settings → Resources → Memory : mettre au moins 4 Go
