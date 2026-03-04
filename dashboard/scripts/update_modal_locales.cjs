const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'public', 'locales');
const newKeys = {
    ko: {
        "modal.product_info": "상품 정보",
        "sourcing.request_quote": "소싱-견적 요청"
    },
    en: {
        "modal.product_info": "Product Information",
        "sourcing.request_quote": "Request Sourcing Quote"
    },
    vi: {
        "modal.product_info": "Thông tin sản phẩm",
        "sourcing.request_quote": "Yêu cầu báo giá tìm nguồn"
    },
    th: {
        "modal.product_info": "ข้อมูลผลิตภัณฑ์",
        "sourcing.request_quote": "ขอใบเสนอราคาจัดหา"
    },
    id: {
        "modal.product_info": "Informasi Produk",
        "sourcing.request_quote": "Minta Penawaran Sumber"
    },
    ja: {
        "modal.product_info": "商品情報",
        "sourcing.request_quote": "ソーシング見積もりをリクエスト"
    }
};

fs.readdirSync(localesDir).forEach(file => {
    if (file.endsWith('.json')) {
        const lang = file.replace('.json', '');
        const keysToAdd = newKeys[lang] || newKeys['en'];

        const filePath = path.join(localesDir, file);
        let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // modal object
        if (!data.modal) data.modal = {};
        data.modal.product_info = keysToAdd["modal.product_info"];

        // sourcing object
        if (!data.sourcing) data.sourcing = {};
        data.sourcing.request_quote = keysToAdd["sourcing.request_quote"];

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`Updated ${file}`);
    }
});
