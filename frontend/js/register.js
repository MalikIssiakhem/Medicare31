let current = 1;

  function goTo(step) {
    if (step > current && !validate(current)) return;

    // Update stepper
    for (let i = 1; i <= 4; i++) {
      const s = document.getElementById('s' + i);
      s.classList.remove('active', 'done');
      if (i < step) s.classList.add('done');
      if (i === step) s.classList.add('active');
    }

    // Update panels
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel' + step).classList.add('active');

    // Fill summary on step 4
    if (step === 4) fillSummary();

    current = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── VALIDATE ── */
  function validate(step) {
    let ok = true;

    function check(id, errId, condition) {
      const el  = document.getElementById(id);
      const err = document.getElementById(errId);
      if (!condition(el.value)) {
        el.classList.add('error');
        err.classList.add('show');
        ok = false;
      } else {
        el.classList.remove('error');
        el.classList.add('valid');
        err.classList.remove('show');
      }
    }

    if (step === 1) {
      check('nom',    'err-nom',    v => v.trim().length > 0);
      check('prenom', 'err-prenom', v => v.trim().length > 0);
      check('ddn',    'err-ddn',    v => v.length > 0);
      check('sexe',   'err-sexe',   v => v !== '');
    }

    if (step === 2) {
      check('email',   'err-email',   v => /\S+@\S+\.\S+/.test(v));
      check('tel',     'err-tel',     v => v.replace(/\s/g,'').length >= 10);
      check('adresse', 'err-adresse', v => v.trim().length > 0);
      check('cp',      'err-cp',      v => /^\d{5}$/.test(v));
      check('ville',   'err-ville',   v => v.trim().length > 0);
    }

    if (step === 3) {
      const pwd  = document.getElementById('pwd').value;
      const pwd2 = document.getElementById('pwd2').value;
      const q1   = document.getElementById('q1');
      const r1   = document.getElementById('r1');
      const cgu  = document.getElementById('cgu');
      const hds  = document.getElementById('hds');

      if (pwd.length < 8) {
        document.getElementById('pwd').classList.add('error');
        document.getElementById('err-pwd').classList.add('show');
        ok = false;
      } else {
        document.getElementById('pwd').classList.remove('error');
        document.getElementById('err-pwd').classList.remove('show');
      }

      if (pwd !== pwd2 || pwd2.length === 0) {
        document.getElementById('pwd2').classList.add('error');
        document.getElementById('err-pwd2').classList.add('show');
        ok = false;
      } else {
        document.getElementById('pwd2').classList.remove('error');
        document.getElementById('err-pwd2').classList.remove('show');
      }

      if (!q1.value) {
        q1.classList.add('error');
        document.getElementById('err-q1').classList.add('show');
        ok = false;
      } else {
        q1.classList.remove('error');
        document.getElementById('err-q1').classList.remove('show');
      }

      if (!r1.value.trim()) {
        r1.classList.add('error');
        document.getElementById('err-r1').classList.add('show');
        ok = false;
      } else {
        r1.classList.remove('error');
        document.getElementById('err-r1').classList.remove('show');
      }

      if (!cgu.checked) {
        document.getElementById('err-cgu').classList.add('show');
        ok = false;
      } else {
        document.getElementById('err-cgu').classList.remove('show');
      }

      if (!hds.checked) {
        document.getElementById('err-hds').classList.add('show');
        ok = false;
      } else {
        document.getElementById('err-hds').classList.remove('show');
      }
    }

    return ok;
  }

  /* ── SUMMARY ── */
  function fillSummary() {
    const civ = document.querySelector('input[name="civilite"]:checked');
    document.getElementById('sum-civ').textContent    = civ ? civ.value : '—';
    document.getElementById('sum-nom').textContent    = document.getElementById('nom').value    || '—';
    document.getElementById('sum-prenom').textContent = document.getElementById('prenom').value || '—';
    const ddn = document.getElementById('ddn').value;
    if (ddn) {
      const d = new Date(ddn);
      document.getElementById('sum-ddn').textContent = d.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
    }
    document.getElementById('sum-email').textContent   = document.getElementById('email').value   || '—';
    document.getElementById('sum-tel').textContent     = document.getElementById('tel').value     || '—';
    const adr = [document.getElementById('adresse').value, document.getElementById('cp').value, document.getElementById('ville').value].filter(Boolean).join(', ');
    document.getElementById('sum-adresse').textContent = adr || '—';
  }

  /* ── FINAL SUBMIT ── */
  async function submitForm() {
    const btn = document.querySelector('.btn-submit-final');
    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';

    const civ = document.querySelector('input[name="civilite"]:checked');
    const payload = {
      civilite:                 civ ? civ.value : null,
      nom:                      document.getElementById('nom').value.trim(),
      prenom:                   document.getElementById('prenom').value.trim(),
      date_naissance:           document.getElementById('ddn').value,
      sexe:                     document.getElementById('sexe').value || null,
      numero_securite_sociale:  document.getElementById('numsecu').value.replace(/\s/g, '') || null,
      email:                    document.getElementById('email').value.trim(),
      password:                 document.getElementById('pwd').value,
      telephone_principal:      document.getElementById('tel').value.replace(/\s/g, '') || null,
      telephone_secondaire:     document.getElementById('tel2').value.replace(/\s/g, '') || null,
      adresse_ligne1:           document.getElementById('adresse').value.trim() || null,
      code_postal:              document.getElementById('cp').value.trim() || null,
      ville:                    document.getElementById('ville').value.trim() || null,
      question_secrete:         document.getElementById('q1').value || null,
      reponse_secrete:          document.getElementById('r1').value.trim() || null,
      cgu_accepted:             document.getElementById('cgu').checked,
      hds_consent:              document.getElementById('hds').checked,
      notif_email_sms_consent:  document.getElementById('notifs').checked,
    };

    try {
      const res = await fetch('/api/auth/register/patient', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Une erreur est survenue. Veuillez réessayer.');
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Créer mon compte';
        return;
      }

      document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('stepper').style.display = 'none';
      const sv = document.getElementById('successView');
      sv.classList.add('show');
      document.getElementById('successEmail').textContent = payload.email;

    } catch {
      alert('Impossible de contacter le serveur. Vérifiez votre connexion.');
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Créer mon compte';
    }
  }

  /* ── PASSWORD STRENGTH ── */
  function checkStrength(v) {
    let score = 0;
    if (v.length >= 8)           score++;
    if (/[A-Z]/.test(v))         score++;
    if (/[0-9]/.test(v))         score++;
    if (/[^A-Za-z0-9]/.test(v))  score++;

    const colors  = ['#f04438','#f79009','#e8a838','#12b76a'];
    const labels  = ['Très faible','Faible','Moyen','Fort'];
    const bars    = ['sb1','sb2','sb3','sb4'];

    bars.forEach((id, i) => {
      document.getElementById(id).style.background = i < score ? colors[score - 1] : 'var(--border)';
    });

    document.getElementById('strengthLabel').textContent = v.length ? labels[score - 1] || 'Très faible' : 'Entrez un mot de passe';
    document.getElementById('strengthLabel').style.color = v.length ? colors[score - 1] : 'var(--text-light)';
  }

  /* ── EYE TOGGLE ── */
  function toggleEye(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon  = document.getElementById(iconId);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.innerHTML = isHidden
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
         <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
         <line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
         <circle cx="12" cy="12" r="3"/>`;
  }

  /* ── FORMAT SECU ── */
  document.getElementById('numsecu').addEventListener('input', function() {
    let v = this.value.replace(/\D/g, '').substring(0, 15);
    this.value = v.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{3})(\d{3})(\d{2})?/, (_, ...g) =>
      g.filter(Boolean).join(' ')
    );
  });

  /* ── FORMAT TEL ── */
  ['tel','tel2'].forEach(id => {
    document.getElementById(id).addEventListener('input', function() {
      let v = this.value.replace(/\D/g, '').substring(0, 10);
      this.value = v.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    });
  });