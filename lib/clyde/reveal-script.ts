/**
 * Le script d'apparition des blocs, exécuté AVANT l'hydratation de React.
 *
 * Pourquoi il ne vit pas dans un composant : révéler des nœuds du DOM n'est pas
 * une affaire de React. Tant que cette logique était dans un `useEffect`, elle
 * attendait que React s'hydrate — mesuré à 2,5 s sur la page d'accueil, alors
 * que le HTML était prêt à 0,6 s. Le titre existait, complet, mais restait à
 * `opacity: 0` : l'utilisateur voyait une page blanche et concluait que le site
 * était lent. Ici, l'observateur est en place dès que le HTML est analysé.
 *
 * Ce fichier exporte une chaîne, injectée telle quelle dans un `<script>` du
 * `<head>`. Elle ne peut donc rien importer et reste en syntaxe ES5, sans
 * transpilation : elle s'exécute dans les navigateurs anciens autant que
 * récents, et son coût d'analyse est négligeable.
 */
export const REVEAL_SCRIPT = `
(function () {
  var SEL = '[data-reveal]';
  var doc = document;

  /* Marque la prise en charge par ce script. Le composant de secours côté React
     s'en sert pour savoir qu'il n'a rien à refaire, et éviter deux
     observateurs concurrents sur les mêmes nœuds.

     Le drapeau vit sur \`window\`, pas en attribut de \`<html>\` : cet élément est
     rendu par le layout, donc React en surveille les attributs et signalait
     celui-ci comme un écart d'hydratation. Une variable globale ne fait partie
     d'aucun arbre et n'a rien à réconcilier. */
  window.__clydeRevealBoot = true;

  /* On pose un attribut, jamais une classe : \`class\` appartient à React sur ces
     nœuds. L'écrire avant l'hydratation créait un écart que React signalait et
     ne réparait pas, puis effaçait au rendu suivant — le bloc disparaissait
     alors définitivement. \`data-in\` n'est écrit par personne d'autre. */
  function show(node) {
    node.setAttribute('data-in', '1');
  }

  function shown(node) {
    return node.hasAttribute('data-in');
  }

  /* Sans IntersectionObserver, tout est montré d'emblée : mieux vaut une page
     sans animation qu'une page vide. */
  if (typeof IntersectionObserver === 'undefined') {
    var showAllNow = function () {
      var all = doc.querySelectorAll(SEL);
      for (var i = 0; i < all.length; i++) show(all[i]);
    };
    showAllNow();
    doc.addEventListener('DOMContentLoaded', showAllNow);
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          show(entries[i].target);
          observer.unobserve(entries[i].target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );

  function handle(node) {
    if (shown(node)) return;
    var rect = node.getBoundingClientRect();
    /* Déjà dans l'écran : on montre au prochain rendu, sans passer par
       l'observateur. C'est ce chemin qui décide de la vitesse perçue, puisque
       c'est celui du contenu que l'utilisateur regarde en premier. */
    if (rect.top < window.innerHeight * 0.92) {
      requestAnimationFrame(function () {
        show(node);
      });
    } else {
      observer.observe(node);
    }
  }

  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches && root.matches(SEL)) handle(root);
    if (!root.querySelectorAll) return;
    var found = root.querySelectorAll(SEL);
    for (var i = 0; i < found.length; i++) handle(found[i]);
  }

  scan(doc.documentElement);

  /* Le HTML arrive en flux, et un changement de langue remplace des cartes
     entières. Observer les ajouts couvre les deux cas : sans cela, un bloc
     arrivé après ce script resterait invisible pour toujours. */
  var mutations = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var added = records[i].addedNodes;
      for (var j = 0; j < added.length; j++) scan(added[j]);
    }
  });
  mutations.observe(doc.documentElement, { childList: true, subtree: true });

  /* Filet de sécurité : au-delà de 2 s, tout bloc encore masqué est montré.
     Une animation ratée est un détail, une page vide est un site cassé. */
  window.setTimeout(function () {
    var left = doc.querySelectorAll(SEL + ':not([data-in])');
    for (var i = 0; i < left.length; i++) show(left[i]);
  }, 2000);
})();
`
