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
- Maintenabilite : le panneau delegue le formulaire, le handshake OBS, la session Twitch et les actions de simulation a des modules dedies.
- Simulations live isolees : stress test, notification OBS, suppression test et AutoMod restent testables hors du controle principal.
- Visuels Twitch gratuits : un interrupteur active badges, couleurs de pseudo et emotes, avec badges officiels si OAuth peut les charger.
- Emotes externes gratuites : une option separee active 7TV, BetterTTV et FrankerFaceZ quand le live Twitch est connecte.
- Stress test Twitch : la rafale inclut aussi badges, couleurs de pseudo et emotes pour verifier le rendu visuel en saturation.
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
3. Clique sur `Message de test`.
4. Copie l'URL OBS generee.
5. Ajoute une source `Browser Source` dans OBS.
6. Colle l'URL, puis ajuste largeur et hauteur.
7. Garde le panneau ouvert pendant les tests : les reglages et boutons de test sont envoyes a l'overlay deja charge.
8. Surveille la carte `OBS` : elle confirme si la source OBS est detectee et si la derniere commande a ete recue.

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
- `src/twitch` : OAuth, EventSub, session Twitch, assets de badges et mapping moderation.
- `src/ui` : branchement DOM, formulaire de controle, diagnostic OBS et vues.
- `styles` : presentation.
- `tests` : tests sans dependances externes.


