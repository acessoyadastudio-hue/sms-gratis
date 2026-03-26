const fetch = require('node-fetch');

async function check5Sim() {
  try {
    const countriesRes = await fetch('https://5sim.net/v1/guest/countries');
    const countries = await countriesRes.json();
    console.log('Countries keys (first 5):', Object.keys(countries).slice(0, 5));

    const productsRes = await fetch('https://5sim.net/v1/guest/products/brazil/any');
    const products = await productsRes.json();
    console.log('Products keys (first 5):', Object.keys(products).slice(0, 5));
  } catch (err) {
    console.error(err);
  }
}

check5Sim();
