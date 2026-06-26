# ChatPulse

MVP statique pour un overlay chat Twitch/OBS oriente fiabilite et diagnostic.

## Objectif

Le premier sprint prouve la valeur principale sans cout serveur : afficher un overlay OBS propre, tester un message avant live, et montrer un centre de diagnostic lisible. La connexion Twitch OAuth/EventSub est optionnelle et reste separee de l'URL OBS pour ne jamais exposer de token sensible.

## Socle deja verifie

- Architecture separee : `src/core`, `src/chat`, `src/twitch`, `src/ui`, `styles` et `tests`.
- Securite OBS : l'URL OBS ne contient pas de token Twitch, meme quand OAuth est active.
- OAuth optionnel : ChatPulse reste utilisable en demo, stress test et configuration sans identification.
- Moderation cote rendu : messages supprimes, bloques AutoMod, bannis, timeout ou purges sont retires de l'overlay et conserves dans l'historique/diagnostic.
- Handshake OBS : le panneau detecte si l'overlay OBS charge est vivant, si les reglages correspondent et si les commandes sont recues.
- Reglages OBS a chaud : l'overlay garde la meme URL et recupere les changements via le serveur local `127.0.0.1:8080`, meme si OBS n'a pas le meme stockage navigateur que le panneau.
- Maintenabilite : le panneau delegue le formulaire, le handshake OBS, la session Twitch et les actions de simulation a des modules dedies.
- Simulations live isolees : stress test, notification OBS, suppression test et AutoMod restent testables hors du controle principal.
- Visuels Twitch gratuits : l'option `Badges et emotes Twitch officiels` active badges, couleurs de pseudo et emotes.
- Badges Twitch officiels : en live OAuth, ChatPulse charge les badges globaux et les badges dedies a la chaine, dont les badges abonnes propres au streamer.
- Apercu local des badges : les tests visuels utilisent de vrais badges CDN Twitch pour moderateur et VIP ; le badge abonne reste generique sans chaine connectee.
- Emotes externes gratuites : l'option `Emotes externes 7TV, BTTV et FFZ` charge 7TV, BetterTTV et FrankerFaceZ quand le live Twitch est connecte.
- Statut visuels Twitch : le panneau affiche si OAuth est connecte, si les badges officiels/chaine sont charges et si les emotes externes utilisent un fallback.
- Stress test Twitch : la rafale inclut badges, couleurs de pseudo, emotes Twitch et emotes externes pour verifier le rendu visuel en saturation.
- Profils rapides : Just Chatting, FPS, Mobile, Minimal et Grand ecran appliquent des reglages d'affichage sans toucher aux donnees Twitch sensibles.
- Options premium verrouillables : un registre central permet de passer n'importe quel reglage en premium sans exposer la valeur dans l'URL OBS.
- Couverture actuelle : configuration, URL OBS, moderation, EventSub, historique, diagnostic, handshake OBS et smoke HTML/CSS.
- Positionnement produit : ChatPulse doit vendre de la fiabilite/debug OBS avant de vendre seulement un joli overlay.

## Lancer localement

Ce prototype reste leger et sans dependance externe.

```powershell
npm.cmd test
npm.cmd run check
```

Pour essayer dans un navigateur ou OBS, lance le serveur statique local :

```powershell
npm.cmd run dev
```

Ouvre ensuite `http://127.0.0.1:8080/`. OBS doit utiliser une URL HTTP locale plutot que `file://` pour charger les modules JavaScript proprement.

## Utilisation OBS

1. Ouvre la page de controle `index.html`.
2. Configure la chaine, la couleur et le mode debug.
3. Dans `Options OBS`, coche `Badges et emotes Twitch officiels` si tu veux voir les badges/emotes/couleurs.
4. Coche `Emotes externes 7TV, BTTV et FFZ` si tu veux tester les emotes externes.
5. Clique sur `Message de test`.
6. Copie l'URL OBS generee.
7. Ajoute une source `Browser Source` dans OBS.
8. Colle l'URL, puis ajuste largeur et hauteur.
9. Garde le panneau ouvert pendant les tests : les reglages et boutons de test sont envoyes a l'overlay deja charge.
10. Surveille la carte `OBS` : elle confirme si la source OBS est detectee et si la derniere commande a ete recue.
11. Surveille aussi `Visuels Twitch` pour savoir si ChatPulse utilise les assets reels ou un fallback.

Important : si le serveur local reste lance sur `127.0.0.1:8080`, tu peux changer les options du panneau sans recoller l'URL OBS. Couleur, animation, taille, opacite, nombre de messages, badges, emotes et commandes de test sont synchronises a chaud.

## Checklist de test manuel

Utilise cette checklist a chaque ajout d'option ou avant de considerer une version comme testable par un streamer.

### Preparation

- [ ] Lancer `npm.cmd test`.
- [ ] Lancer `npm.cmd run check`.
- [ ] Lancer `npm.cmd run dev`.
- [ ] Ouvrir le panneau sur `http://127.0.0.1:8080/`.
- [ ] Ouvrir l'URL OBS dans une source OBS ou dans un second onglet `overlay.html`.
- [ ] Verifier que l'URL OBS ne contient jamais `token`, `access_token`, `client_secret` ou donnee OAuth sensible.

### Reglages de base

- [ ] Modifier `Chaine Twitch` : le resume de l'URL OBS doit changer, et le changement doit rester sans token.
- [ ] Modifier `Couleur principale de l'overlay` : les nouveaux messages de l'apercu et de l'overlay OBS doivent prendre la nouvelle couleur.
- [ ] Appliquer chaque `Profil rapide` : les valeurs doivent changer sans modifier la chaine Twitch, le Client ID, OAuth ou les options sensibles.
- [ ] Passer la souris sur chaque profil rapide : la petite description doit expliquer clairement le cas d'usage.

### Connexion Twitch

- [ ] Sans OAuth : le mode demo doit rester utilisable, avec messages de test, stress test et URL OBS.
- [ ] Avec un Client ID invalide ou absent : le diagnostic Twitch doit rester comprehensible et ne pas bloquer le reste.
- [ ] Si OAuth est teste : le token doit rester dans le navigateur du panneau, jamais dans l'URL OBS.
- [ ] `Demarrer le live` ne doit pas casser le mode demo si Twitch n'est pas connecte.

### Flux des messages

- [ ] Modifier `Duree des messages` : la valeur precise doit changer et la duree minimum doit rester a 5 secondes.
- [ ] Modifier `Nombre messages visible` de 1 au maximum : l'apercu doit adapter sa hauteur et ne pas deborder.
- [ ] Modifier `Sens d'apparition` : les nouveaux messages doivent apparaitre dans le bon sens dans l'apercu et dans l'overlay OBS.
- [ ] Modifier `Position dans OBS` : l'overlay OBS deja ouvert doit se replacer a gauche, centre ou droite sans recoller l'URL.

### Personnalisation avancee

- [ ] Ouvrir puis fermer `Personnalisation avancee` : le bloc doit rester visible, lisible et sans gros vide.
- [ ] Modifier `Style des messages` : compact et confortable doivent changer le rendu des cartes.
- [ ] Modifier `Taille du texte` : le texte doit rester net, lisible et sans mots coupes.
- [ ] Modifier `Espacement` : les cartes ne doivent ni se chevaucher ni creer trop de vide.
- [ ] Modifier `Opacite du fond` : le fond des messages doit changer sans rendre le texte illisible.
- [ ] Modifier `Arrondi des cartes` : les cartes doivent changer sans casser l'alignement.
- [ ] Modifier `Animation` entre glissement, fondu et aucune : un stress test en cours doit continuer sans relancer l'overlay.

### Options OBS et visuels

- [ ] `Afficher le diagnostic dans OBS` : le panneau debug OBS doit apparaitre/disparaitre selon l'option.
- [ ] `Afficher le badge DEMO/LIVE` : le badge doit rester coherent avec le mode courant.
- [ ] `Activer les notifications OBS` : les alertes doivent apparaitre dans l'apercu et l'overlay.
- [ ] `Badges et emotes Twitch officiels` : les messages de test doivent afficher badges, couleurs de pseudo et emotes Twitch.
- [ ] `Emotes externes 7TV, BTTV et FFZ` : les messages compatibles doivent afficher les emotes externes quand l'option est activee.
- [ ] Desactiver les options de visuels : le texte doit rester lisible, sans images cassees.

### Boutons de test

- [ ] `Messages de test` : l'apercu et l'overlay OBS doivent afficher les memes messages au meme moment.
- [ ] `Tester alerte OBS` : une notification doit apparaitre, puis disparaitre en douceur avant une autre notification.
- [ ] `Activer AutoMod` puis envoyer des messages : les messages bloques ne doivent jamais rester visibles.
- [ ] `Lancer stress test` : les messages doivent arriver progressivement, pas tous d'un bloc dans l'historique.
- [ ] Pendant le stress test, changer couleur, animation, position et nombre de messages : l'overlay OBS doit suivre sans recoller l'URL.
- [ ] `Simuler suppression` : le message cible doit disparaitre de l'apercu, de l'overlay et rester consultable dans l'historique.
- [ ] `Simuler alerte` : le journal doit recevoir un evenement clair sans casser l'overlay.
- [ ] `Simuler erreur` : le diagnostic doit passer en attention/erreur avec un message lisible.

### Historique et moderation

- [ ] L'historique doit afficher les messages au fil de l'eau, pas en bloc apres un stress test.
- [ ] Les messages supprimes, bloques AutoMod, bannis, timeout ou clear chat ne doivent plus etre visibles dans l'overlay.
- [ ] Le bouton `Messages moderes` doit filtrer uniquement les messages moderes.
- [ ] Cliquer un message modere dans l'historique doit permettre de voir son contenu original.
- [ ] Les badges et emotes doivent rester visibles dans l'historique quand les options sont activees.

### Handshake OBS et sync a chaud

- [ ] Avec l'overlay OBS ouvert, la carte `OBS` doit confirmer que la source est detectee.
- [ ] Envoyer une commande depuis le panneau : OBS doit confirmer la reception.
- [ ] Changer un reglage pendant que l'overlay OBS est deja ouvert : l'URL OBS doit rester identique et le rendu doit changer.
- [ ] Fermer ou recharger l'overlay OBS : le diagnostic doit revenir a un etat comprehensible.

### Premium locks et securite

- [ ] Une option verrouillee premium doit etre desactivee visuellement et ne pas modifier l'URL OBS.
- [ ] Les valeurs premium verrouillees doivent revenir a une valeur gratuite sure.
- [ ] Les options gratuites actuelles de visuels Twitch et emotes externes doivent rester accessibles.
- [ ] Aucun ajout ne doit exposer token, Client Secret, email Twitch ou donnee privee dans l'URL OBS, les logs visibles ou l'historique public.

### Validation finale avant push

- [ ] Recharger le panneau et refaire un `Messages de test`.
- [ ] Recharger l'overlay OBS et refaire un `Lancer stress test`.
- [ ] Verifier qu'il n'y a pas de texte coupe, debordement, bouton gris incoherent ou valeur illisible.
- [ ] Relancer `npm.cmd test`.
- [ ] Relancer `npm.cmd run check`.
- [ ] Verifier `git status --short` et ne pas publier de dossier commencant par un point, sauf demande explicite.

## Etat des visuels Twitch

- Sans OAuth : ChatPulse affiche l'apercu, les fallbacks visuels et les messages de test.
- Avec OAuth et option Twitch activee : ChatPulse recupere les badges officiels globaux et les badges de la chaine via Twitch.
- Les badges abonnes reels dependent de chaque chaine ; ils sont donc fiables quand la chaine est connectee.
- Les emotes externes 7TV, BTTV et FFZ sont chargees separement quand l'option externe est activee.
- Le panneau `Visuels Twitch` donne un etat direct : non connecte, apercu local, assets charges ou fallback actif.
- La partie premium future ne doit pas bloquer ces visuels : elle doit plutot ajouter diagnostic, cache, verification et export.

## Securite

- Le mode demo ne demande aucune identification.
- OAuth Twitch n'est pas obligatoire.
- L'URL OBS ne contient pas de token.
- Les preferences sont locales au navigateur.
- Le futur backend SaaS devra stocker les tokens cote serveur de facon chiffree, avec scopes minimaux.

## Structure

- `index.html` : centre de controle et diagnostic.
- `overlay.html` : page transparente pour OBS.
- `src/core` : logique testable et reutilisable.
- `src/chat` : sources de messages et resolution des emotes externes.
- `src/twitch` : OAuth, EventSub, session Twitch, assets de badges, badges d'aperçu et mapping moderation.
- `src/ui` : branchement DOM, formulaire de controle, diagnostic OBS et vues.
- `styles` : presentation.
- `tests` : tests sans dependances externes.


