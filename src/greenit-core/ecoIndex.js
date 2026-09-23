/*
 *  Copyright (C) 2019  didierfred@gmail.com
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published
 *  by the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
const reference = require('ecoindex_reference/ecoindex_reference.json');

/**
 * Calcul ecoIndex based on formula from web site www.ecoindex.fr
 **/
function computeEcoIndex(dom, req, size) {
    const q_dom = computeQuantile(reference.quantiles.dom_size, dom);
    const q_req = computeQuantile(reference.quantiles.nb_request, req);
    const q_size = computeQuantile(reference.quantiles.response_size, size);

    return Math.round(100 - (5 * (3 * q_dom + 2 * q_req + q_size)) / 6);
}

function computeQuantile(quantiles, value) {
    for (let i = 1; i < quantiles.length; i++) {
        if (value < quantiles[i]) return i + (value - quantiles[i - 1]) / (quantiles[i] - quantiles[i - 1]);
    }
    return quantiles.length;
}

function getEcoIndexGrade(ecoIndex) {
    const sortedGrades = reference.grades.toSorted((a, b) => b.value - a.value);
    const found = sortedGrades.find(grade => ecoIndex > grade.value);
    return found ? found.grade : 'G';
}

function computeGreenhouseGasesEmissionfromEcoIndex(ecoIndex) {
    return Math.round(100 * (2 + (2 * (50 - ecoIndex)) / 100)) / 100;
}

function computeWaterConsumptionfromEcoIndex(ecoIndex) {
    return Math.round(100 * (3 + (3 * (50 - ecoIndex)) / 100)) / 100;
}
