# ✅ Check-list de présentation — Medicare31

> À imprimer / cocher **1 semaine avant**, puis **la veille**, puis **le matin**.

---

## 📅 J-7 (une semaine avant)

### Infrastructure
- [ ] **Docker Desktop** installé et qui tourne (`docker --version` répond)
- [ ] **Git** installé (`git --version`)
- [ ] Code à jour :
  ```powershell
  cd C:\...\Medicare31
  git checkout fix/junior
  git pull
  ```
- [ ] Au moins **5 Go d'espace disque** libre sur le PC
- [ ] WiFi fonctionnel + **partage 4G de secours** testé

### Code
- [ ] `.env` configuré (MailHog **OU** Brevo)
- [ ] Premier démarrage testé :
  ```powershell
  docker compose up -d --build
  docker compose ps    # tous les services "Up"
  ```

### SMTP
- [ ] Diagnostic OK :
  ```powershell
  docker compose exec backend python scripts/diagnose_smtp.py
  ```
  → doit afficher **4 étapes ✅**
- [ ] **Mode dev (MailHog)** : inscription test → email visible sur `localhost:8025`
- [ ] **Mode prod (Brevo)** : inscription avec ton vrai email → email reçu

### Données de démo
- [ ] Quelques patients de test créés
- [ ] Quelques rendez-vous de démo
- [ ] Un message dans la messagerie
- [ ] Quelques documents joints

### Captures / Vidéo
- [ ] **Captures d'écran** des écrans clés :
  - Dashboard
  - Liste patients
  - Agenda
  - Messagerie
  - MailHog ou boîte mail avec l'email de vérif
- [ ] **Vidéo de démo 2 min** enregistrée (en backup si le live plante)

---

## 📅 J-1 (la veille)

### Vérification fonctionnelle complète
- [ ] Tout est relancé :
  ```powershell
  docker compose down
  docker compose up -d --build
  ```
- [ ] Health check API : http://localhost/api/health → OK
- [ ] Health check SMTP : http://localhost/api/health/smtp → `reachable: true`
- [ ] Swagger UI : http://localhost/docs → s'ouvre
- [ ] Inscription d'un user de test → email arrive (vérifier spams aussi)
- [ ] Connexion avec ce user → dashboard accessible
- [ ] Création d'un patient → visible dans la liste
- [ ] Création d'un RDV → visible dans l'agenda
- [ ] Envoi d'un message interne → visible dans la messagerie

### Configuration scénario
- [ ] **Scénario A** (sur le laptop) : rien à faire de plus
- [ ] **Scénario B** (jury sur réseau local) :
  - IP locale notée : `192.168.1.___`
  - Pare-feu ouvert : `New-NetFirewallRule -DisplayName "Medicare31 HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow`
- [ ] **Scénario C** (ngrok) :
  - ngrok installé
  - Token configuré
  - Test : `ngrok http 80` → URL publique OK

### Backup
- [ ] **Captures d'écran** sur une clé USB (au cas où)
- [ ] **Vidéo** de démo 2 min sur la clé USB
- [ ] Le repo Git est à jour (pas de modifs non commit)

### Logistique
- [ ] **Chargeur** du laptop dans le sac
- [ ] **Câble Ethernet + adaptateur USB-C** dans le sac (recommandé)
- [ ] **Téléphone avec partage 4G fonctionnel** (backup Internet)
- [ ] Si présentation à distance : **casque + micro** testés

---

## 📅 J-0 (le matin / 1h avant)

### Setup
- [ ] PC branché sur secteur (pas sur batterie)
- [ ] WiFi connecté et **testé** :
  ```powershell
  Test-NetConnection smtp-relay.brevo.com -Port 587
  # Si Brevo : doit afficher TcpTestSucceeded: True
  ```
- [ ] Partage 4G **testé** en backup

### Lancement
- [ ] Docker Desktop est démarré (icône verte en bas à droite)
- [ ] Lancer le projet :
  ```powershell
  docker compose up -d --build
  ```
- [ ] Attendre 30 secondes, puis :
  ```powershell
  docker compose ps
  # Tous Up ? Sinon : docker compose logs backend --tail=30
  ```

### Vérification express (5 min)
- [ ] http://localhost → la page d'accueil s'affiche
- [ ] http://localhost/docs → Swagger accessible
- [ ] http://localhost/api/health/smtp → `reachable: true`
- [ ] Onglet `localhost:8025` ouvert (MailHog, si mode dev)

### Préparation des onglets du navigateur
Ouvrir Chrome / Edge avec ces onglets prêts :
1. **localhost** (dashboard / page d'accueil)
2. **localhost/docs** (Swagger — pour montrer l'API)
3. **localhost:8025** (MailHog — si mode dev)
4. **ta boîte mail** (Gmail / Outlook — si mode Brevo)
5. Un onglet vide pour les `curl` live si tu veux bluffer

### Premier test à blanc (10 min)
- [ ] Tu t'inscris toi-même avec ton email → tu reçois l'email
- [ ] Tu te connectes → dashboard accessible
- [ ] Tu crées un patient
- [ ] Tu prends un RDV
- [ ] Tu envoies un message

→ **Si tout ça marche, tu es prêt.**

---

## 🎤 Pendant la présentation

### Phrase d'accroche SMTP (à placer au bon moment)

> *"Pour démontrer que le système d'envoi d'emails fonctionne en
> conditions réelles, je vais demander à un membre du jury de
> s'inscrire avec son adresse email personnelle. Vous allez voir
> l'email arriver en direct."*

### Si quelque chose plante

| Symptôme | Solution express |
|---|---|
| Docker ne répond plus | Redémarrer Docker Desktop |
| Port 80 occupé | Changer `80:80` → `8080:80` dans docker-compose |
| Brevo timeout | Basculer sur MailHog (`.env` → `smtp_host=mailhog`, restart backend) |
| Le PC rame | `docker stats` → identifier le conteneur qui consomme, `docker compose restart <service>` |
| Internet coupé | Brancher partage 4G du téléphone |

### Ce que tu n'as PAS besoin de dire

- Pas besoin d'expliquer HDS, Brevo, Docker en détail
- Le jury veut voir **que ça marche**, pas comment c'est fait
- Si une question est trop technique : *"C'est documenté dans le README, on peut y revenir si vous voulez"*

---

## 📅 J+1 (après)

- [ ] Éteindre Docker :
  ```powershell
  docker compose down
  ```
- [ ] Si tu ne veux plus garder la DB : `docker compose down -v`
- [ ] Noter ce qui a bien marché / ce qui a planté pour la prochaine fois
