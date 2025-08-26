const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const router = express.Router();

const dataDir = path.join(__dirname, '..', 'data');
const countriesPath = path.join(dataDir, 'countries.csv');
const statesPath = path.join(dataDir, 'states.csv');

// Endpoint to get all countries
router.get('/countries', (req, res) => {
    const results = [];
    fs.createReadStream(countriesPath)
        .pipe(csv())
        .on('data', (data) => results.push({ id: data.id, name: data.name }))
        .on('end', () => {
            res.json(results);
        })
        .on('error', (error) => {
            console.error('Error reading countries CSV:', error);
            res.status(500).send('Error processing request');
        });
});

// Endpoint to get states by country ID
router.get('/states/:countryId', (req, res) => {
    const { countryId } = req.params;
    const results = [];
    fs.createReadStream(statesPath)
        .pipe(csv())
        .on('data', (data) => {
            if (data.country_id === countryId) {
                results.push({ id: data.id, name: data.name });
            }
        })
        .on('end', () => {
            res.json(results);
        })
        .on('error', (error) => {
            console.error(`Error reading states CSV for countryId ${countryId}:`, error);
            res.status(500).send('Error processing request');
        });
});

module.exports = router;
