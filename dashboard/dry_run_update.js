const fs = require('fs');
const path = require('path');

const filePath = path.join('f:/cursor/datapool/dashboard', 'main.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Total length:', content.length);

const returnPagesIdx = content.lastIndexOf('return pages;');
console.log('returnPagesIdx:', returnPagesIdx);

if (returnPagesIdx !== -1) {
    const startSearchIdx = content.indexOf('}', returnPagesIdx);
    console.log('startSearchIdx (getPageRange end):', startSearchIdx);
    if (startSearchIdx !== -1) {
        console.log('Context around start:', content.substring(startSearchIdx - 20, startSearchIdx + 20));
    }
}

const closeModalIdx = content.indexOf('function closeModal()');
console.log('closeModalIdx:', closeModalIdx);

if (closeModalIdx !== -1) {
    console.log('Context around end:', content.substring(closeModalIdx - 20, closeModalIdx + 20));
}
