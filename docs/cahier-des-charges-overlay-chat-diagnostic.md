# Cahier des charges - ChatPulse

Date : 2026-06-25
Statut : Specification produit initiale, avant implementation

## 1. Vision

Construire un overlay chat Twitch pour OBS destine aux streamers semi-professionnels, avec une proposition de valeur centree sur la fiabilite, le diagnostic et la tranquillite en live.

Le produit ne doit pas etre presente comme un simple widget de chat supplementaire. Il doit etre positionne comme un outil anti-galere pour streamers : un overlay qui affiche le chat, mais surtout qui explique clairement si tout fonctionne, ce qui ne fonctionne pas, et pourquoi.

Promesse produit :

> Un overlay chat OBS fiable, elegant et diagnosticable, concu pour eviter les pannes invisibles en plein live.

## 2. Positionnement

### Segment vise

Streamers semi-professionnels.

Ils ont deja une audience, une exigence d'image, une configuration OBS plus avancee que les debutants, et une vraie douleur quand un overlay casse en live. Ils peuvent payer plus tard pour de la fiabilite, des themes propres, des profils sauvegardes et des fonctions premium.

### Probleme principal

Les overlays chat existants peuvent etre beaux, mais ils manquent souvent de diagnostic clair. Quand le chat ne s'affiche pas, le streamer ne sait pas rapidement si le probleme vient de Twitch, OBS, du token, du cache navigateur, d'une mauvaise URL, d'une scene OBS, d'une erreur reseau ou du widget lui-meme.

### Valeur ajoutee

Le produit transforme une panne floue en etat comprehensible :

- Connecte ou non connecte a Twitch.
- Dernier message recu.
- Latence estimee.
- Erreur d'authentification.
- Permissions OAuth manquantes.
- Reconnexion en cours.
- Erreur de rendu overlay.
- Mode test avant live.

## 3. Objectifs du MVP

Le MVP doit prouver une chose : un streamer peut verifier en moins d'une minute que son overlay chat est pret pour le live.

Objectifs prioritaires :

1. Afficher un chat Twitch dans OBS avec un rendu premium minimal.
2. Fournir un centre de diagnostic clair.
3. Permettre un mode demo sans connexion Twitch.
4. Permettre une connexion Twitch OAuth optionnelle pour un diagnostic plus serieux.
5. Ne pas exposer de token sensible dans l'URL OBS.
6. Ne pas generer de cout fixe au lancement.
7. Garder une architecture compatible avec un futur SaaS.

## 4. Perimetre fonctionnel MVP

### 4.1 Page overlay OBS

La page overlay est l'URL que le streamer ajoute dans OBS via une Browser Source.

Fonctions attendues :

- Affichage des messages du chat.
- Rendu compact, lisible et sobre.
- Animations courtes et propres.
- Gestion de la disparition progressive des messages.
- Mode transparent pour OBS.
- Support responsive selon la taille de source OBS.
- Etat visuel discret en cas de probleme critique si le mode debug est active.

### 4.2 Page controle et diagnostic

La page controle sert a configurer, tester et diagnostiquer l'overlay.

Fonctions attendues :

- Statut global : pret, attention, erreur.
- Statut Twitch : non connecte, connecte, token invalide, reconnexion.
- Statut OBS/browser : overlay charge, derniere activite, erreurs de rendu.
- Dernier message recu.
- Compteur de messages recus.
- Latence approximative.
- Journal d'evenements lisible.
- Bouton de message test.
- Simulation de panne pour montrer la valeur du diagnostic.
- Copie de l'URL OBS.

### 4.3 Mode demo sans compte

Le mode demo doit fonctionner sans authentification.

Fonctions attendues :

- Messages simules.
- Faux etats de diagnostic.
- Apercu du rendu overlay.
- Possibilite de tester OBS sans donner acces a Twitch.

Objectif business : reduire la friction et permettre une demonstration immediate.

### 4.4 Mode Twitch connecte OAuth

OAuth est optionnel mais recommande.

Fonctions attendues :

- Connexion Twitch volontaire.
- Permissions minimales.
- Validation de token.
- Diagnostic des droits disponibles.
- Recuperation fiable du chat selon l'approche technique retenue.
- Explication claire si la connexion echoue.

Regle de securite : l'overlay OBS ne doit jamais recevoir un token Twitch sensible dans son URL.

## 5. Securite et confidentialite

### Principes

1. OAuth optionnel.
2. Mode demo sans donnee personnelle.
3. Permissions Twitch minimales.
4. Aucun token sensible dans l'URL OBS.
5. Pas de stockage inutile de donnees utilisateur.
6. Journal de diagnostic local et non intrusif.
7. Architecture preparee pour chiffrer les tokens cote serveur quand le SaaS arrivera.

### Donnees a eviter dans le MVP

- Adresse email Twitch.
- Donnees personnelles non necessaires.
- Historique complet du chat.
- Donnees de paiement.
- Informations privees de moderation.

### Donnees acceptables dans le MVP

- Nom de chaine.
- Parametres d'affichage.
- Etat technique de connexion.
- Dernier message recu pour diagnostic.
- Logs techniques courts et explicites.

## 6. Architecture recommandee

Approche recommandee : app web statique gratuite, preparee pour le SaaS.

### Phase 1 - Sans cout fixe

Hebergement possible sur une offre gratuite type Cloudflare Pages ou Vercel.

Composants :

- Overlay OBS statique.
- Centre de controle statique.
- Connecteur Twitch separe.
- Module diagnostic separe.
- Module rendu separe.
- Configuration locale exportable/importable.

### Phase 2 - SaaS leger

Ajouts futurs :

- Backend OAuth securise.
- Comptes utilisateurs.
- Profils sauvegardes.
- URLs OBS persistantes.
- Themes premium.
- Abonnement.
- Analytics de fiabilite.

## 7. Modules techniques

### 7.1 Module rendu

Responsabilites :

- Transformer les messages en elements visuels.
- Gerer l'ordre, la duree, l'animation et la lisibilite.
- Isoler la logique CSS/animation de la logique Twitch.

### 7.2 Module diagnostic

Responsabilites :

- Centraliser les evenements techniques.
- Produire un statut clair.
- Detecter les erreurs importantes.
- Fournir des messages compréhensibles par un streamer non developpeur.

### 7.3 Module Twitch

Responsabilites :

- Gerer la connexion.
- Gerer la reconnexion.
- Gerer OAuth si active.
- Normaliser les messages recus.
- Remonter les erreurs au diagnostic.

### 7.4 Module configuration

Responsabilites :

- Stocker les preferences locales.
- Generer l'URL OBS.
- Exporter/importer une configuration.
- Preparer la migration future vers sauvegarde cloud.

## 8. Experience utilisateur

### Premier usage ideal

1. Le streamer ouvre la page controle.
2. Il choisit tester sans compte ou connecter Twitch.
3. Il voit un apercu du chat.
4. Il clique sur message test.
5. Il copie l'URL OBS.
6. Il ajoute l'URL dans OBS.
7. Le centre de diagnostic confirme que l'overlay est actif.

### Ton produit

Le produit doit etre rassurant, clair et professionnel. Le diagnostic doit parler le langage du streamer, pas celui d'un developpeur.

Exemples de messages :

- Pret pour le live.
- Twitch connecte, dernier message recu il y a 12 secondes.
- Attention : aucun message recu depuis 10 minutes.
- Token Twitch expire, reconnecte ton compte.
- OBS semble avoir recharge l'overlay.

## 9. Design visuel MVP

Le rendu doit etre premium mais volontairement minimal pour eviter de consommer trop de temps au depart.

Direction conseillee :

- Fond transparent pour OBS.
- Cartes de message compactes.
- Typographie lisible.
- Couleurs sobres.
- Accent visuel personnalisable.
- Animation courte d'entree/sortie.
- Pas d'effet gadget.

Le centre de controle doit ressembler a un outil professionnel : dense, lisible, oriente statut et action.

## 10. Hors perimetre MVP

A ne pas construire au debut :

- Paiement.
- Marketplace de themes.
- IA.
- Multi-plateforme YouTube/TikTok/Kick.
- Application desktop.
- Installation locale.
- Gestion d'equipe.
- Historique complet du chat.
- Analytics business avances.

## 11. Risques

### Risques techniques

- Changements d'API Twitch.
- Limites d'OBS Browser Source.
- Gestion delicate des tokens OAuth.
- Connexion temps reel instable.
- Emotes/badges plus complexes que prevu.

### Risques produit

- Trop ressembler a un overlay existant.
- Trop investir dans le visuel avant de prouver la valeur debug.
- Rendre OAuth obligatoire trop tot.
- Creer une UX trop technique pour les streamers.

### Risques business

- Difficulte a monetiser un simple overlay.
- Support client chronophage.
- Concurrence des outils gratuits.

## 12. Opportunites

- Diagnostic OBS/Twitch comme differenciation forte.
- Mode demo partageable pour acquisition rapide.
- Themes premium plus tard.
- Offres pour streamers semi-pro.
- Packs pour agences overlay.
- Extension future vers alertes, moderation visuelle et resume chat.

## 13. Monetisation future

Modele recommande : freemium.

Gratuit :

- Overlay de base.
- Mode demo.
- Diagnostic simple.
- Un theme premium minimal.

Payant :

- Profils sauvegardes.
- Themes premium.
- Multi-overlays.
- Diagnostic avance.
- Historique d'incidents.
- Support prioritaire.
- IA/resume chat plus tard.

## 14. Indicateurs de succes MVP

Le MVP est reussi si :

- Un streamer comprend la proposition de valeur en moins de 30 secondes.
- L'overlay peut etre ajoute dans OBS sans aide.
- Le bouton test message fonctionne.
- Le diagnostic affiche un etat clair.
- Une panne simulee est comprehensible.
- Le produit donne envie de connecter Twitch pour plus de fiabilite.

## 15. Strategie recommandee

Decision : construire d'abord un MVP web gratuit heberge, sans serveur payant, avec OAuth optionnel et architecture preparee pour SaaS.

Ordre conseille :

1. Prototype statique overlay + controle + messages simules.
2. Diagnostic local complet.
3. URL OBS configurable.
4. Connexion Twitch optionnelle.
5. Validation avec 3 a 5 streamers semi-pro.
6. Passage vers backend/SaaS seulement si la valeur est confirmee.

## 16. Question ouverte avant implementation

Avant d'ecrire le plan technique, il reste une decision a verrouiller :

Faut-il integrer la connexion Twitch dans le premier sprint, ou d'abord livrer un prototype demo/debug sans OAuth pour valider l'experience OBS et le positionnement ?

Recommandation : commencer par le prototype demo/debug sans OAuth, mais structurer le code pour ajouter OAuth juste apres.

