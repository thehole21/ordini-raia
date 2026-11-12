# Ordini RAIA
Portale riservato con catalogo per azienda, carrello, storico e pannello amministrativo. Gli amministratori attivi del gestionale usano la propria email. Titocci accede con il nome utente Titocci.

## Configurazione
Revisionare database/portal.sql prima di applicarlo al progetto Supabase del gestionale: l'invio registra ordine e righe e aggiorna raia_workspace nella stessa transazione. Applicare poi database/catalogo.sql. Il catalogo contiene 29 adesivi distinti. I prezzi mancanti rimangono da definire.

In Supabase Authentication creare un utente confermato con email tecnica titocci@clienti.ordini.raiaweb.it e password scelta. Collegarlo eseguendo database/accesso.sql. Nessuna password va salvata nel repository.

Importare la repository su Vercel, impostare le variabili di .env.example (chiave segreta solo per creare altri utenti). Configurazione build già in vercel.json. In locale: Node 22.9 o superiore, npm run dev. Verifica con npm run build.

