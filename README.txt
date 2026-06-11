Vakantieplanner - gedeelde Netlify versie

Deze versie gebruikt GEEN Firebase.
De website staat op Netlify en de gedeelde opslag loopt via Netlify Functions + Netlify Blobs.
Iedereen die dezelfde URL opent, werkt dus in dezelfde planner.

Belangrijk:
- Alleen index.html uploaden is NIET genoeg.
- De map netlify/functions moet ook mee gedeployed worden.
- Dit werkt dus als Netlify-project met Functions, niet als losse simpele HTML-drop zonder build/function support.

Bestanden:
- index.html
- netlify.toml
- package.json
- netlify/functions/planner-data.mjs

Aanbevolen deploy:
1. Zet deze map in een GitHub repository en koppel die aan Netlify.
2. Netlify installeert dan automatisch @netlify/blobs uit package.json.
3. Deploy naar productie.

Alternatief met Netlify CLI:
1. Open Terminal in deze map.
2. npm install
3. npx netlify login
4. npx netlify link  (kies je bestaande site: vrije-dagen / vrijedagen)
5. npx netlify deploy --prod

Na deploy:
- Open je site.
- Als onderaan staat: 'Verbonden. Wijzigingen worden centraal opgeslagen', dan werkt de gedeelde opslag.
- Als je een fout ziet over gedeelde opslag, is de Function niet mee gedeployed.
