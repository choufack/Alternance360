
async function debugFetch() {
    const url = "https://data.apprentissage.beta.gouv.fr/api/explore/v2.1/catalog/datasets/fiches-rncp/records?where=numero_fiche=%22RNCP38565%22&limit=1";
    console.log('Fetching:', url);
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    const body = await response.text();
    console.log('Body:', body.slice(0, 500));
}

debugFetch()
    .catch(err => console.error(err));
