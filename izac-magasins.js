/* ============================================================
   IZAC — Référentiel magasins partagé (izac-magasins.js)
   À inclure dans chaque outil AVANT son script principal :
     <script src="izac-magasins.js"></script>
   Expose : window.IZAC_MAG (objet code->nom) et window.izacLoadMag(sb)

   Fonctionnement :
   - Au départ, IZAC_MAG = copie locale de secours (toujours dispo).
   - Si on appelle izacLoadMag(sb) avec un client Supabase, il lit la
     table 'magasins' et met à jour IZAC_MAG avec les noms à jour.
   - Si Supabase ne répond pas, on garde la copie locale : rien ne casse.
   ============================================================ */
(function(){
  // --- Copie locale de secours (fallback) ---
  var FALLBACK = {"1009":"Auber","1010":"B. Epin","1028":"Rue Ren","1045":"Parinor","1104":"Creteil","1198":"Velizy","1215":"St Quentin","1254":"Auberv.","1332":"St Laz.","1339":"Fontai.","1352":"Levallois","1353":"Claye Souilly","1449":"Aeroville","1489":"Quartz","1498":"Gonesse","1552":"Val D'europe","1568":"Carre Senart","1575":"La Defense","1604":"Rosny 2","1655":"Parly 2","1665":"Montparnasse","1692":"Trading","1696":"Forum Des Halles","1748":"Beaugrenelle","1756":"Boulogne","1779":"Arcueil","1782":"Corbeil","1109":"St Denis","1199":"Beziers","1335":"Lille","1350":"Perpignan Auchan","1354":"Nancy","1355":"Nantes Crebillons","1377":"Ptstem","1427":"Perpignan Claira","1451":"Clermont","1487":"Strasb.","1543":"A13","1563":"St Omer","1566":"Beauv.","1608":"Anglet","1615":"N Creb","1618":"Euralille","1648":"Roubaix","1651":"Pau","1659":"Reims","1667":"G. Var","1668":"Noyelles","1670":"Brest","1672":"St Eti.","1683":"Arras","1721":"Bethune","1729":"Lillenium","1735":"Villefontaine","1740":"Romans","1785":"Gap","1011":"Herriot","1057":"Siege","1074":"Blagnac","1330":"Confluence","1331":"Montpellier","1334":"Rouen","1426":"Begles","1448":"Dijon","1450":"R Alma","1469":"Monta.","1470":"Avignon","1485":"Merignac","1486":"Terrasses Du Port","1488":"La Valentine","1505":"Talang","1513":"Part Dieu","1518":"Ecouf.","1526":"Niort","1544":"Epagny","1545":"Lormont","1567":"Bord.","1592":"Colmar","1597":"Auxer.","1598":"Bastia","1603":"Fenouillet","1609":"Nimes","1621":"Aix","1627":"Miramas","1636":"Metz","1637":"Ajacc.","1654":"Prado","1666":"Cap","1669":"Voiron","1671":"Andrezieux","1694":"Mulhou.","1704":"Blois","1716":"Epinal","1724":"Olonne","1728":"Cannes","1732":"Haguenau","1737":"Bordeaux Lac","1738":"Ecully","1739":"Toulouse","1742":"Thionville","1743":"Mont De Marsan","1749":"Aix En Provence","1755":"Besancon","1787":"La Rochelle","1791":"Tours","1792":"Grenoble","1793":"Dijon Cv","1801":"Rennes Cv","1703":"Luxembourg","1054":"T. D H. 72","1055":"Tdh 61","1070":"Côte Homme","1204":"Marco Men","1207":"Hopium","1286":"Jasyl Sarl","1289":"Manceau Eurl","1305":"Aff D Homme","1317":"Wilhelem Sa","1349":"Bloom David","142":"Brousseau","1434":"Aumaclaire","1461":"B. Engelyc","1492":"Jack Mod","1496":"Buxy","1510":"Senso","1511":"Boutik Homme","1512":"Havane","1581":"Vanni.O","1643":"Rezland","1645":"Show Room","1661":"Langlais","1678":"H. Dhomme","1708":"Les Galeries Sas Du Grand Baza","1710":"Boutique Mr","1711":"Coupin","1715":"Boutique Raphael","1722":"O Masculin","1758":"We Are Select / Was","1760":"Les Sables","1769":"Boy And Girl","1773":"Xavier Men'S Wear","1780":"Boutique Monsieur","1783":"G3M Diffusion / Printemps Le H","1794":"Will'S","1799":"Printemps Caen / Jel Diffusion","1805":"Driver","318":"Espace Griff","380":"Gentlemen","437":"Hors Ligne","507":"Labau","532":"Le Gendre Ideal","566":"Matco Sarl","576":"La Maison","61":"Arvet Sarl","717":"Penaud","724":"Pinel","835":"Cap Code / Sngd","851":"Sporlux","954":"Verso Sarl","997":"Jld Diff.","1224":"As St Etienne Att. Valerie Sem","1318":"G. Lemoine","1457":"Boz Couture","1557":"Abv Service","1623":"Cote Homm","1641":"Mhb / Benjamin Terme","1650":"E. Griffe","1675":"Losc","1699":"Place Aux Hommes","1700":"We Are Select W.A.S.","1718":"Escale","1726":"Cloane Square","1766":"Iconik Store Chez We Are Selec","1775":"Oscar","1776":"Ol Sasu / Att Florence Dams Et","1781":"Rennes Alma","1784":"Griffe Rouge","1800":"Sas Racing Club De Lens / Arth","1808":"Sas Racing Club De Strasbourg","1812":"Affaire D'Homme","216":"Cosmopolite","626":"Mickelson","647":"Morence","1411":"Lol By L.","1795":"Hotel Le Grand Mazarin / Att.","1814":"My Comm","206":"Mossis J. - Sarl Come Back","268":"Donald Bout.","479":"Js Trading","559":"M.C.S. Sarl","1527":"Fashion R.","1546":"Rackstore M.","1629":"Mkm -","1646":"Basile Boutique","1830":"Neyrpic","1835":"Orleans","1831":"Strasbourg Centre Ville","1828":"Caen","1818":"Sarl Roy","1549":"Firex","1578":"Pretty Women","1701":"Mon Vestaire","1768":"Abc","1807":"Pont Ste Marie","1820":"Le 18 Sarl","1823":"Dress Code","1833":"Le 10 Coffy Distribution","1834":"Tarantola","1841":"Montal Sarl","1815":"Sas Expentour","1837":"Chabe","1843":"Deauville","1777":"Boutique Hom","1839":"Clothing Distributions","1845":"Showroom Formen","952":"Vente Privee.Com","1291":"Somajy","1840":"Cabries","1844":"Polygone","1842":"Le Mans","1851":"Sas Baron","1850":"Sas Rc Strasbourg","1852":"Bey First 2","1865":"Giverny","1862":"Chambery","1861":"Jump Atelier"};

  // IZAC_MAG démarre avec le fallback : toujours disponible immédiatement.
  window.IZAC_MAG = Object.assign({}, FALLBACK);

  // Helper : nom d'un magasin (échappé pour affichage HTML)
  window.izacMagName = function(code){
    var n = window.IZAC_MAG[code] || '';
    return n.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  };

  // Charge/rafraîchit depuis Supabase. Renvoie une promesse.
  // sb = client supabase déjà créé. Sûr : en cas d'échec, garde le fallback.
  window.izacLoadMag = async function(sb){
    if(!sb) return window.IZAC_MAG;
    try{
      var all=[];
      for(var from=0;;from+=1000){
        var res = await sb.from('magasins').select('code,nom,ville,dept,actif').range(from,from+999);
        if(res.error) throw res.error;
        var data = res.data||[];
        all = all.concat(data);
        if(data.length<1000) break;
      }
      var map={}, details={};
      all.forEach(function(m){
        if(m && m.code){
          if(m.nom) map[m.code]=m.nom;
          details[m.code]={nom:m.nom||'',ville:m.ville||'',dept:m.dept||'',actif:m.actif!==false};
        }
      });
      // On fusionne : Supabase prioritaire, fallback pour les codes absents.
      if(Object.keys(map).length){
        window.IZAC_MAG = Object.assign({}, FALLBACK, map);
      }
      window.IZAC_MAG_DETAILS = details; // ville/dept/actif si besoin
      return window.IZAC_MAG;
    }catch(e){
      // Supabase indisponible -> on garde la copie locale, pas d'erreur bloquante.
      console.warn('[izac-magasins] Supabase indisponible, copie locale utilisée.', e && e.message);
      return window.IZAC_MAG;
    }
  };
})();
