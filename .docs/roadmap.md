# Roadmap ChatPulse

Date : 2026-06-25
Objectif : transformer ChatPulse en overlay OBS commercialisable, differencie par la fiabilite, le diagnostic et la lisibilite.

## Positionnement

ChatPulse ne doit pas devenir un clone de Streamlabs ou StreamElements. La valeur ajoutee principale doit rester :

- un overlay chat lisible ;
- une integration OBS simple ;
- une promesse anti-perte de messages ;
- un diagnostic clair avant et pendant le live ;
- une connexion Twitch optionnelle, utile mais non obligatoire.

## Socle deja valide

Ce socle doit rester vrai a chaque evolution majeure :

- architecture maintenable separee entre `core`, `twitch`, `ui`, `styles` et `tests` ;
- controle principal decoupe entre formulaire, session Twitch, handshake OBS et actions de simulation ;
- URL OBS sans token Twitch ni secret sensible ;
- OAuth utile pour le diagnostic pro, mais jamais obligatoire pour la demo et les reglages ;
- handshake OBS local : presence de la source, config chargee et accuse de reception des commandes ;
- moderation traitee par le rendu : suppression, AutoMod, ban, timeout, purge et retrait de messages ;
- historique consultable pour comprendre les messages affiches, supprimes, bloques ou retires ;
- visuels Twitch de base gratuits : badges moderateur/VIP/abonne, emotes et couleurs de pseudo activables sans offre payante ;
- tests couvrant configuration, URL OBS, moderation, EventSub, historique, diagnostic, handshake OBS et smoke HTML/CSS ;
- promesse produit centree sur la fiabilite/debug OBS avant la personnalisation visuelle.

## Phase 1 - MVP solide et gratuit

Objectif : permettre a un streamer de configurer et tester son overlay sans compte, sans serveur payant et sans risque de token expose.

Fonctions prioritaires :

- Centre de controle en francais.
- URL OBS configurable.
- Mode demo sans identification.
- Stress test de messages.
- Historique local des messages recus.
- Journal de diagnostic.
- Reglages visuels de base : position, sens d'apparition, taille, opacite, arrondi, espacement, animation.
- Profils rapides : Just Chatting, FPS, Mobile, Minimal et Grand ecran.
- Bouton de notification OBS de test.
- Diagnostic OBS local : source detectee, reglages differents et confirmation des commandes de test.
- Groupes de reglages lisibles.

## Phase 2 - Valeur ajoutee immediate

Objectif : aider le streamer a obtenir un overlay propre rapidement, meme s'il ne sait pas regler les details.

### Profils de reglages

Socle en place :

- Just Chatting.
- FPS.
- Mobile.
- Minimal.
- Grand ecran.

Chaque profil ajuste les parametres importants : duree, taille du texte, nombre de messages visibles, opacite, position, animation et espacement, sans modifier chaine Twitch, Client ID, couleur, debug ou options OBS.

Ameliorations possibles :

- apercu visuel du profil avant application ;
- conseil automatique selon la taille de l'overlay OBS ;
- sauvegarde de profils personnalises en premium.

### Mode lisibilite automatique

Ajouter un bouton qui optimise automatiquement :

- taille du texte ;
- contraste ;
- nombre maximum de messages visibles ;
- opacite du fond ;
- espacement ;
- arrondi ;
- densite d'affichage.

Valeur produit : beaucoup de streamers ne savent pas regler un overlay lisible. ChatPulse doit pouvoir leur proposer un rendu correct en un clic.

### Previsualisation OBS avec zones sures

Ajouter une previsualisation 16:9 avec reperes :

- zone webcam ;
- zone gameplay ;
- zone chat ;
- zones a eviter ;
- indication de debordement ou de texte trop petit.

Objectif : eviter que le chat recouvre une minimap, des sous-titres, un HUD ou une zone importante du jeu.

## Phase 3 - Integration Twitch utile

Objectif : rendre la connexion Twitch suffisamment interessante pour justifier l'OAuth, sans la rendre obligatoire.

### Connexion Twitch optionnelle

Sans login :

- demo ;
- configuration ;
- URL OBS ;
- stress test ;
- simulation AutoMod ;
- diagnostic local ;
- export de configuration sans donnee sensible.

Avec OAuth :

- vrai chat Twitch ;
- badges ;
- emotes ;
- couleurs de pseudo ;
- messages recus ;
- messages affiches ;
- messages supprimes ;
- evenements de moderation ;
- trous dans la numerotation des messages ;
- diagnostic Twitch plus serieux ;
- detection des erreurs de connexion ;
- export de diagnostic pro.

Regles de securite :

- aucun token sensible ne doit apparaitre dans l'URL OBS ;
- demander uniquement les permissions Twitch necessaires ;
- expliquer clairement ce que l'OAuth apporte avant la connexion ;
- permettre d'utiliser ChatPulse sans compte pour la demo, les reglages et le stress test ;
- stocker les donnees sensibles localement au debut, tant qu'il n'y a pas de backend securise.

Valeur produit : sans OAuth, ChatPulse reste utile pour configurer et tester. Avec OAuth, ChatPulse devient un outil de diagnostic professionnel capable de verifier ce qui se passe vraiment sur le chat.

### Badges et emotes Twitch

Garder en gratuit, car c'est attendu par les streamers et cela rend l'overlay credible des le MVP :

- badges moderateur ;
- badges VIP ;
- badges abonne ;
- emotes Twitch ;
- emotes externes populaires : 7TV, BetterTTV et FrankerFaceZ ;
- couleurs de pseudo.

Regle produit : ces elements ne doivent pas devenir le paywall principal. Le premium doit plutot porter sur le diagnostic avance, les exports, les profils sauvegardes, les themes avances, le replay d'incident et le cloud securise.

## Phase 4 - Fiabilite et diagnostic premium

Objectif : faire de ChatPulse un outil rassurant avant le live, pas seulement un widget visuel.

### Filtres anti-bruit

Options a ajouter :

- masquer les commandes comme `!discord`, `!uptime`, `!lurk` ;
- masquer certains bots ;
- ralentir ou grouper les messages identiques ;
- compacter les messages trop longs ;
- ignorer les messages vides ou trop courts ;
- masquer partiellement les mots bannis ou insultes avec `***` quand le message passe quand meme les filtres ;
- afficher un avertissement si trop de messages sont en attente.

### Masquage partiel des mots sensibles

Ajouter une liste configurable de mots bannis et insultes. Quand un message est autorise a s'afficher mais contient un mot de cette liste, ChatPulse ne doit pas supprimer tout le message : seul le mot sensible est remplace par `***`.

Regles produit :

- garder le message lisible si le reste du contenu est acceptable ;
- ne pas confondre avec AutoMod, ban, timeout ou suppression Twitch ;
- journaliser l'evenement comme `mot masque`, pas comme `message bloque` ;
- proposer une liste de base gratuite, puis plus tard des listes sauvegardees/personnalisees en premium ;
- appliquer le masquage dans l'aperçu, l'overlay OBS et l'historique exportable.

### Journal de fiabilite exportable

Ajouter un bouton `Exporter le diagnostic` avec :

- messages recus ;
- messages affiches ;
- messages en attente ;
- messages supprimes ;
- messages bloques ou non affiches ;
- trous detectes dans la suite des messages ;
- evenements de moderation Twitch ;
- erreurs Twitch ;
- erreurs OBS ;
- configuration utilisee ;
- horodatage des evenements importants.

Formats a prevoir :

- export JSON pour debug, support et analyse technique ;
- export texte lisible pour que le streamer ou un moderateur comprenne vite l'incident ;
- plus tard, export partageable avec anonymisation des pseudos/messages sensibles.

Valeur differenciante : un streamer peut comprendre ce qui s'est passe apres un live ou envoyer un rapport clair au support.

### Diagnostic Twitch pro

Quand l'OAuth est active, ajouter un tableau de verification live avec :

- compteur messages recus cote Twitch ;
- compteur messages affiches cote overlay ;
- compteur messages supprimes par moderation ;
- compteur messages bloques avant affichage quand l'evenement est accessible ;
- detection des trous dans la suite des messages ;
- alerte si l'overlay prend du retard ;
- alerte si OBS n'affiche plus les nouveaux messages ;
- export d'incident partageable avec le support ou un moderateur.

Objectif : prouver que ChatPulse ne fait pas seulement un bel overlay, mais aide le streamer a savoir si son chat est fiable en conditions reelles.

### Niveau de preuve OBS

Court terme, ChatPulse doit verifier que l'overlay OBS est bien charge et repond :

- heartbeat envoye par la page overlay ;
- confirmation des commandes envoyees depuis le panneau ;
- compteur visible, en attente et recu cote overlay ;
- alerte si l'overlay ne repond plus ou ne confirme pas une commande.

Limite importante : cela prouve que la page navigateur de l'overlay fonctionne, mais pas avec certitude absolue qu'OBS affiche chaque pixel dans la scene finale. OBS peut masquer la source, la redimensionner, la placer hors ecran ou etre capture differemment.

Piste premium future :

- mode de verification visuelle guidee ;
- checklist OBS avec taille, position, source visible et source active ;
- capture ou preuve visuelle seulement si OBS, un plugin ou une integration locale fiable le permet.

Limite a documenter : les messages bloques par AutoMod avant publication ne sont pas toujours visibles sans permissions Twitch adaptees. La roadmap doit distinguer clairement simulation locale, suppression apres publication et evenement Twitch reel.

### Relecture d'incident

Ajouter plus tard un mode `Replay diagnostic` :

- rejouer les 30 dernieres secondes d'un incident ;
- revoir les messages recus, affiches, supprimes et en attente ;
- identifier le moment exact ou l'overlay a pris du retard ;
- comparer configuration utilisee et charge du chat.

Valeur commerciale : utile pour les streamers serieux, les moderateurs et le support client.

### Mode test OBS guide

Ajouter un bouton `Tester dans OBS` qui genere automatiquement :

- message court ;
- message long ;
- pseudo tres long ;
- rafale de messages ;
- notification OBS ;
- simulation de saturation.

Le resultat doit indiquer clairement :

- OK ;
- attention ;
- deborde ;
- trop petit ;
- retard ;
- sature ;
- trop opaque ;
- trop de messages en attente.

## Phase 5 - Personnalisation commercialisable

Objectif : donner envie aux streamers de garder ChatPulse et de payer plus tard pour du confort ou des themes.

### Systeme de themes

Ajouter des themes prets a l'emploi :

- sombre premium ;
- clair ;
- neon ;
- minimal ;
- esport ;
- cozy ;
- transparent fort.

Chaque theme doit modifier plusieurs parametres en meme temps : couleurs, opacite, bordures, animation, densite et style des cartes.

### Regles d'affichage intelligentes

Ajouter des regles configurables :

- garder les messages des abonnes plus longtemps ;
- mettre les moderateurs en evidence ;
- mettre les VIP en evidence ;
- epingler temporairement une question ;
- prioriser les messages qui mentionnent le streamer ;
- reduire l'importance des messages repetitifs.

## Phase 6 - Monetisation future

Objectif : passer d'un outil gratuit utile a un produit commercialisable.

Pistes freemium :

- gratuit : overlay de base, mode demo, diagnostic local, presets simples, badges/emotes/couleurs Twitch et emotes externes 7TV/BTTV/FFZ quand l'option est activee ;
- payant : options verrouillables via registre premium, profils sauvegardes, themes premium, diagnostic exportable avance, diagnostic Twitch pro, multi-overlays, historique d'incidents, replay d'incident, support prioritaire ;
- plus tard : backend OAuth securise, compte streamer, sauvegarde cloud, URL OBS persistante.

## Phase 7 - Multi-plateformes future

Objectif : ne pas limiter ChatPulse a Twitch a long terme, tout en gardant Twitch comme priorite jusqu'a ce que le diagnostic soit vraiment solide.

Plateformes possibles :

- YouTube Live Chat ;
- Kick ;
- autres plateformes seulement si elles apportent une demande claire des streamers.

Approche technique recommandee :

- creer une interface commune `chat source` pour normaliser messages, auteurs, badges, suppressions et evenements de moderation ;
- garder les connecteurs plateformes separes pour ne pas melanger Twitch, YouTube et Kick dans le meme code ;
- commencer par lecture des messages, puis ajouter moderation et diagnostic quand les API le permettent ;
- documenter les limites propres a chaque plateforme, surtout pour AutoMod, suppressions et evenements non exposes.

Risque : le multi-plateformes peut ralentir le produit si Twitch n'est pas deja excellent. A traiter comme extension business, pas comme prerequis MVP.

## Ordre d'implementation recommande

### 1. Quick wins fiabilite

Objectif : renforcer vite la promesse centrale sans backend et sans cout serveur.

1. Export du diagnostic simple en JSON et texte lisible.
2. Mode test OBS guide avec verdicts : OK, attention, deborde, trop petit, retard, sature.
3. Mode lisibilite automatique.
4. Filtres anti-bruit locaux : commandes, bots, spam identique, messages trop longs.
5. Masquage partiel des mots bannis et insultes avec `***`.
6. Profils personnalises sauvegardables.

Pourquoi cet ordre : ces points exploitent deja les compteurs, l'historique, le stress test et les reglages existants. Ils donnent vite une valeur visible au streamer.

### 2. Ergonomie OBS et personnalisation utile

Objectif : aider le streamer a placer et regler l'overlay proprement avant d'ajouter des integrations plus lourdes.

6. Previsualisation OBS avec zones sures.
7. Systeme de themes simples : sombre premium, clair, neon, minimal, esport, cozy, transparent fort.
8. Regles d'affichage intelligentes de base : modos/VIP visibles, mentions prioritaires, questions epinglees.

Pourquoi cet ordre : la personnalisation avancee devient utile quand la base fiable est deja lisible et testable.

### 3. Valeur pro Twitch

Objectif : transformer ChatPulse en outil de diagnostic live, pas seulement en overlay demo.

9. Connexion Twitch OAuth finalisee et expliquee clairement.
10. Vrai chat Twitch en conditions live.
11. Detection des suppressions reelles et evenements de moderation accessibles.
12. Diagnostic Twitch pro : recus, affiches, supprimes, moderation, trous, retard.
13. Fiabilisation des badges officiels, emotes Twitch, emotes externes 7TV/BTTV/FFZ et couleurs de pseudo dans le vrai live.

Pourquoi cet ordre : les badges et emotes sont importants, mais le vrai avantage concurrentiel vient d'abord du diagnostic fiable sur les messages et la moderation.

### 4. Diagnostic premium

Objectif : creer les fonctions qui justifient une offre payante.

14. Verification OBS avancee : heartbeat, confirmation de commandes, alertes de non-reponse, checklist OBS.
15. Rapport lisible apres incident avec donnees anonymisables.
16. Replay d'incident : revoir les dernieres secondes d'un probleme.
17. Historique d'incidents local, puis export partageable.

Pourquoi cet ordre : ces fonctions sont plus difficiles, mais elles creent la difference business face aux overlays classiques.

### 5. SaaS et monetisation

Objectif : passer d'un outil local gratuit a un produit commercialisable sans sacrifier la securite.

18. Backend OAuth securise avec tokens chiffres cote serveur.
19. Comptes utilisateurs.
20. Sauvegarde cloud des profils, themes et diagnostics.
21. URL OBS persistante.
22. Multi-overlays et support prioritaire.

Pourquoi cet ordre : le cloud devient pertinent seulement quand les fonctions locales donnent deja envie de garder ChatPulse.

### 6. Extensions long terme

Objectif : elargir le marche quand Twitch est deja solide.

23. Interface commune `chat source` pour preparer plusieurs plateformes.
24. YouTube Live Chat.
25. Kick.
26. Diagnostic multi-plateformes quand les API le permettent.

Pourquoi cet ordre : YouTube/Kick peuvent ouvrir le marche, mais les ajouter trop tot risque de ralentir le coeur du produit.

## Priorite produit

Priorite court terme : ne pas perdre la proposition de valeur centrale.

ChatPulse doit d'abord etre le meilleur outil pour verifier que le chat OBS est lisible, stable et pret pour le live. Les themes premium viennent ensuite, mais ne doivent pas remplacer la promesse de fiabilite.
