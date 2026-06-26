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


