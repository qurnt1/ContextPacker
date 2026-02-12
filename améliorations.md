pouvoir changer le nombre de token max (ici c que 128k) (dans une page parametre ou jsp ce qu'est le mieux)

mettre ContextPacker en haut a gauche avec le logo pr genre rappelelr le nom de l'application 

pour la minification mettre un hover qui explique ce que ca fait quand on active 

pour la partie extensions (en dessous du btn minification), il faut chnager le texte en "extensions a selectionner" et trier les extensions par nombre de fichier plutot que par ordre alphabetique

faut plus mettre en valeur le copier dans le presse papier pour le résultat, c'est quand meme l'utilité principale de l'app, peut etre faire un btn pr telecharger directement en txt le résultat aussi, genre pouvoir soit telecharger soit copier dans le presse papier

il faut que de base ca lise le gitignore pour ne pas inclure les fichiers qui sont dans le gitignore, peut etre ajoute une option, en dessous de extensions genre "prendre en compte le contenu du gitignore" et genre si on selectionne ca et qu'on clique sur le btn tout selectionner ca selectionne tous les fichiers sauf ceux qui sont dans le gitignore, et si on desactive ca bah ca selectionne tout sans se soucier du gitignore pour la partie "selectionner tout"


augmenter la largeur du panneau a gauche, la ca fait trop petit, surtout pour les projets avec bcp de fichiers, ca serait mieux d'avoir plus de place pour voir les noms des fichiers et les extensions le nombre de token et leur taille etc etc (peut etre 15 % en plus), ajouter le nombre de lignes avec le nombre de token et la taille du fichier 

de plus il faut que de base qd je selectionne un dossier, les fichiers ils soient pas tous selectionnes, parce que sinon ca prends du temps a charger, aussi mettre une petite popup qd des dossiers ou fichiers sont vraiment lourd seuil a parametrer sois meme dans un fichier parametre ig) ou genre is c superieur a ce seuil ca fait une popup de confirmation pour eviter de charger pour rien sinon ca peut etre long

aussi faut changer le contenu du texte du bouton pour ouvrir un dossier en haut a gauche la, en genre ouvrir un nouveau dossier ou projet ou un truc du genre, parce que la c pas clair du tout, on sait pas si ca va ouvrir un dossier dans le projet actuel ou si ca va ouvrir un nouveau projet etc etc, faut que ce soit plus clair pour l'utilisateur

ajouter un mode clairet un mode sombre, avec un bouton pour switcher entre les deux, et peut etre aussi une option pour que ca switch automatiquement en fonction de l'heure ou de la luminosité de l'ecran ou un truc du genre, le btn met le en haut a droite a coté du btn de telechargement et de copier dans le presse papier, et aussi ajouter une option dans les parametres pour choisir le theme par defaut (clair ou sombre) en fonction de ce qu'il y a sur le pc si possible (theme windows)

il faut aussi créer un readme stylé au format mardkown pour que ca s'affiche bien sur github, j'ai mis une capture d'écran de la page d'acceuil dans ./assets/accueil.png, il faut que tu l'inclues dans le readme pour que les gens voient a quoi ca ressemble, et aussi expliquer comment utiliser l'application, les fonctionnalités etc etc, et aussi mettre un lien vers la page de parametre pour expliquer les différentes options qu'on peut configurer etc etc