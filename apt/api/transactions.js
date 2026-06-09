const url = require('url');

// Helper to parse configuration from process.env
function getApiKey() {
  return process.env.KEY || null;
}

// Function to generate realistic mock data when external API fails or is unauthorized
function generateMockXml(lawdCd, dealYmd) {
  const year = dealYmd.substring(0, 4);
  const month = parseInt(dealYmd.substring(4, 6), 10).toString();

  // Price base factor by area (in 만원 - 10,000 KRW)
  let priceFactor = 65000; // default 6.5억
  
  if (lawdCd.startsWith('11')) { // Seoul
    if (lawdCd === '11680') priceFactor = 220000; // Gangnam
    else if (lawdCd === '11710') priceFactor = 160000; // Songpa
    else if (lawdCd === '11650') priceFactor = 195000; // Seocho
    else if (lawdCd === '11110') priceFactor = 110000; // Jongno
    else if (lawdCd === '11440') priceFactor = 135000; // Mapo
    else if (lawdCd === '11560') priceFactor = 125000; // Yeongdeungpo
    else priceFactor = 100000;
  } else if (lawdCd.startsWith('41')) { // Gyeonggi
    if (lawdCd === '41135') priceFactor = 130000; // Bundang
    else if (lawdCd === '41465') priceFactor = 95000; // Suji
    else if (lawdCd === '41117') priceFactor = 90000; // Yeongtong
    else priceFactor = 55000;
  } else if (lawdCd.startsWith('26')) { // Busan
    if (lawdCd === '26350') priceFactor = 85000; // Haeundae
    else priceFactor = 45000;
  }

  const aptNames = [
    '자이', '래미안', '푸르지오', '힐스테이트', '아이파크', 
    '더샵', 'e편한세상', '롯데캐슬', '포레나', 'SK뷰', '스위첸'
  ];

  const dongs = {
    '11110': ['사직동', '수송동', '견지동', '무악동', '창신동', '혜화동', '평창동'],
    '11680': ['역삼동', '개포동', '청담동', '삼성동', '대치동', '신사동', '압구정동', '도곡동'],
    '11650': ['방배동', '양재동', '우면동', '반포동', '서초동', '잠원동'],
    '11710': ['잠실동', '신천동', '풍납동', '송파동', '석촌동', '가락동', '문정동', '방이동'],
    '11440': ['아현동', '공덕동', '신수동', '망원동', '연남동', '서교동', '합정동'],
    '11560': ['여의도동', '당산동', '문래동', '영등포동', '신길동', '대림동'],
    '41135': ['분당동', '수내동', '정자동', '서현동', '이매동', '야탑동', '판교동', '삼평동'],
    '41465': ['풍덕천동', '죽전동', '동천동', '상현동', '성복동'],
    '41117': ['영통동', '망포동', '매탄동', '이의동', '하동'],
    '26350': ['우동', '중동', '좌동', '재송동', '반여동']
  };

  const activeDongs = dongs[lawdCd] || ['중앙동', '상가동', '주택가동', '신개발동'];

  let items = '';
  const count = Math.floor(Math.random() * 24) + 12;
  for (let i = 0; i < count; i++) {
    const apt = aptNames[Math.floor(Math.random() * aptNames.length)] + ' ' + (Math.floor(Math.random() * 5) + 1) + '단지';
    const dong = activeDongs[Math.floor(Math.random() * activeDongs.length)];
    const size = (59 + [0, 25, 55][Math.floor(Math.random() * 3)] + (Math.random() * 4 - 2)).toFixed(2);
    const areaVal = parseFloat(size);
    
    const sizeRatio = areaVal / 84;
    const floor = Math.floor(Math.random() * 22) + 1;
    const floorPremium = 1 + (floor * 0.005);
    const buildYear = Math.floor(Math.random() * 22) + 2000;
    const ageDiscount = 1 - ((2026 - buildYear) * 0.006);
    
    const basePrice = Math.floor(priceFactor * sizeRatio * floorPremium * ageDiscount * (0.9 + Math.random() * 0.2));
    const priceStr = basePrice.toLocaleString('ko-KR').padStart(11, ' ');
    const day = (Math.floor(Math.random() * 28) + 1).toString();
    const jibun = Math.floor(Math.random() * 950) + 1;

    items += `
    <item>
      <거래금액>${priceStr}</거래금액>
      <건축년도>${buildYear}</건축년도>
      <년>${year}</년>
      <월>${month.padStart(2, '0')}</월>
      <일>${day.padStart(2, '0')}</일>
      <아파트>${apt}</아파트>
      <전용면적>${size}</전용면적>
      <법정동> ${dong}</법정동>
      <지번>${jibun}</지번>
      <지역코드>${lawdCd}</지역코드>
      <층>${floor}</층>
      <도로명>중앙로</도로명>
    </item>`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<response>
  <header>
    <resultCode>00</resultCode>
    <resultMsg>NORMAL SERVICE (FALLBACK MOCK DATA)</resultMsg>
  </header>
  <body>
    <items>
      ${items}
    </items>
    <numOfRows>${count}</numOfRows>
    <pageNo>1</pageNo>
    <totalCount>${count}</totalCount>
  </body>
</response>`;
}

module.exports = async (req, res) => {
  // CORS Headers configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;

  const lawdCd = query.lawdCd || '11110';
  const dealYmd = query.dealYmd || '202407';
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn('API key is missing. Serving mock data.');
    const mockXml = generateMockXml(lawdCd, dealYmd);
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(mockXml);
    return;
  }

  const targetUrl = `http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${apiKey}&LAWD_CD=${lawdCd}&DEAL_YMD=${dealYmd}&numOfRows=1000&pageNo=1`;

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const xmlData = await response.text();
    
    if (xmlData.includes('<resultCode>') && !xmlData.includes('<resultCode>00</resultCode>') && !xmlData.includes('<resultCode>0</resultCode>')) {
      const errMatch = xmlData.match(/<resultMsg>([^<]+)/);
      const errMsg = errMatch ? errMatch[1] : 'Unknown Public Portal Error';
      throw new Error(`Public Portal Error: ${errMsg}`);
    }
    
    if (!xmlData.includes('<items>') || !xmlData.includes('<item>')) {
      throw new Error('No items found');
    }

    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(xmlData);
  } catch (error) {
    console.warn(`[Proxy Fallback] Serving mock data due to: ${error.message}`);
    const mockXml = generateMockXml(lawdCd, dealYmd);
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(mockXml);
  }
};
