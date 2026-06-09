/* -------------------------------------------------------------
 * Custom Application JavaScript - AptPrice MVP
 * ------------------------------------------------------------- */

// App State
const state = {
  allTransactions: [],
  filteredTransactions: [],
  currentLawdCd: '',
  currentDealYmd: '',
  sortField: 'dealDate',
  sortOrder: 'desc',
  currentPage: 1,
  rowsPerPage: 10
};

// Coordinates database for centering the map
const SIGUNGU_COORDS = {
  '11680': [37.5172, 127.0473], // Gangnam
  '11110': [37.5730, 126.9794], // Jongno
  '11650': [37.4837, 127.0324], // Seocho
  '11710': [37.5145, 127.1058], // Songpa
  '11440': [37.5638, 126.9030], // Mapo
  '11560': [37.5206, 126.9139], // Yeongdeungpo
  '41135': [37.3828, 127.1189], // Bundang
  '41465': [37.3225, 127.0984], // Suji
  '41117': [37.2596, 127.0468], // Yeongtong
  '26350': [35.1631, 129.1636]  // Haeundae
};

const SIDO_COORDS = {
  '11': [37.5665, 126.9780], // Seoul
  '26': [35.1796, 129.0756], // Busan
  '27': [35.8714, 128.6014], // Daegu
  '28': [37.4563, 126.7052], // Incheon
  '29': [35.1595, 126.8526], // Gwangju
  '30': [36.3504, 127.3845], // Daejeon
  '31': [35.5389, 129.3114], // Ulsan
  '36': [36.4801, 127.2890], // Sejong
  '41': [37.2750, 127.0094]  // Gyeonggi
};

// Global chart variables for reuse/destruction
let areaPriceChart = null;
let dailyVolumeChart = null;
let kakaoMap = null;
let kakaoMarkers = [];
let kakaoActiveInfoWindow = null;
let leafletMap = null;
let leafletMarkers = [];
let useLeafletFallback = false;

// Visual Diagnostic tool for Kakao Map SDK issues
// Visual Diagnostic tool overlay for Kakao Map SDK issues
function toggleDiagnosticsOverlay() {
  let overlay = document.getElementById('map-diagnostic-overlay');
  
  if (overlay) {
    if (overlay.style.display === 'none') {
      overlay.style.display = 'flex';
      document.getElementById('map-diagnostic-btn').textContent = '지도 화면으로 돌아가기';
    } else {
      overlay.style.display = 'none';
      document.getElementById('map-diagnostic-btn').textContent = '카카오맵 인증 진단하기';
    }
    return;
  }
  
  // Create overlay element dynamically
  const container = document.querySelector('.map-viewport-container');
  overlay = document.createElement('div');
  overlay.id = 'map-diagnostic-overlay';
  
  const currentProtocol = window.location.protocol;
  const currentHref = window.location.href;
  const isLocalFile = currentProtocol === 'file:';
  
  let sdkLoadStatus = '🔴 로드되지 않음 (네트워크 지연, 도메인 불일치 또는 잘못된 앱 키)';
  
  if (typeof kakao !== 'undefined') {
    if (kakao.maps) {
      sdkLoadStatus = '🟢 스크립트 실행 성공 및 kakao.maps 생성됨';
    } else {
      sdkLoadStatus = '🟡 kakao 객체는 존재하지만 maps 라이브러리 없음 (인증 차단)';
    }
  }

  // Extract App Key from scripts
  const scripts = document.getElementsByTagName('script');
  let extractedKey = '찾을 수 없음';
  for (let script of scripts) {
    if (script.src && script.src.includes('kakao.com')) {
      const match = script.src.match(/appkey=([^&]+)/);
      if (match) {
        extractedKey = match[1];
        break;
      }
    }
  }

  // Apply absolute positioning overlay style
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = 'calc(100% - 30px)'; // leave room for notice
  overlay.style.zIndex = '100';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.padding = '24px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.background = 'rgba(15, 23, 42, 0.98)';
  overlay.style.border = '2px dashed rgba(239, 68, 68, 0.4)';
  overlay.style.borderRadius = '12px';
  overlay.style.color = '#e2e8f0';
  overlay.style.fontFamily = 'var(--font-body), sans-serif';
  overlay.style.fontSize = '13px';
  overlay.style.lineHeight = '1.6';
  overlay.style.overflowY = 'auto';

  overlay.innerHTML = `
    <div style="margin-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 12px; display: flex; align-items: center; gap: 8px;">
      <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 10px #ef4444;"></span>
      <h3 style="margin: 0; font-family: var(--font-display); font-size: 15px; font-weight: 700; color: #f87171;">카카오맵 API 연결 상태 자가 진단</h3>
    </div>
    
    <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; margin-bottom: 18px; background: rgba(0, 0, 0, 0.25); padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); color: #e2e8f0;">
      <div><b>접속 프로토콜</b></div>
      <div>${isLocalFile ? '🔴 <span style="color: #ef4444; font-weight: bold;">로컬 파일(file://) 실행 중 - 지도 사용 불가</span>' : '🟢 웹 서버 접속 중 (정상)'}</div>
      
      <div><b>브라우저 주소</b></div>
      <div style="font-family: monospace; color: #60a5fa; word-break: break-all;">${currentHref}</div>
      
      <div><b>카카오 SDK 상태</b></div>
      <div>${sdkLoadStatus}</div>
      
      <div><b>사용 중인 앱 키</b></div>
      <div style="font-family: monospace; color: #34d399; word-break: break-all;">${extractedKey}</div>
    </div>
    
    <div style="background: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.15); padding: 12px; border-radius: 8px; font-size: 12px; color: #cbd5e1;">
      <h4 style="margin: 0 0 6px 0; color: #fca5a5; font-size: 13px;">💡 해결 조치 순서</h4>
      <ol style="margin: 0; padding-left: 20px; color: #cbd5e1; line-height: 1.6;">
        <li style="margin-bottom: 4px;">파일을 더블 클릭해 여셨다면 브라우저를 닫고 주소창에 <b><a href="http://localhost:3000" target="_blank" style="color: #60a5fa; text-decoration: underline;">http://localhost:3000</a></b>을 입력해 실행해 주세요.</li>
        <li style="margin-bottom: 4px;">카카오 개발자 콘솔 ➔ [플랫폼] ➔ [Web 플랫폼 등록] 메뉴에 접속 주소인 <b>http://localhost:3000</b>과 <b>http://127.0.0.1:3000</b>을 줄바꿈으로 둘 다 추가했는지 확인해 주세요.</li>
        <li>등록된 키가 REST API 키가 아닌 <b>자바스크립트 키 (JavaScript App Key)</b> 인지 확인해 주세요.</li>
      </ol>
    </div>
  `;
  
  container.insertBefore(overlay, document.getElementById('map-notice-area'));
  document.getElementById('map-diagnostic-btn').textContent = '지도 화면으로 돌아가기';
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Initial Lucide icons load
  lucide.createIcons();
  
  initSelectors();
  initFormListeners();
  initTabListeners();
  initFilterListeners();
  initSortListeners();
  
  // Safe load of Kakao Maps SDK when autoload=false is configured
  if (typeof kakao !== 'undefined' && kakao.maps) {
    kakao.maps.load(() => {
      initMap();
    });
  } else {
    console.warn('Kakao Maps SDK is not loaded. Falling back to Leaflet Map (OpenStreetMap).');
    useLeafletFallback = true;
    initMap();
  }
  
  // Set default and max month dynamically to the current month
  const today = new Date();
  const year = today.getFullYear();
  const curMonth = String(today.getMonth() + 1).padStart(2, '0'); // 1-indexed current month
  
  const dealYmdInput = document.getElementById('deal-ymd');
  if (dealYmdInput) {
    const formattedCurMonth = `${year}-${curMonth}`;
    dealYmdInput.max = formattedCurMonth; // Dynamic max selection limit
    dealYmdInput.value = formattedCurMonth; // Default to current month
  }
});

// Initialize Sido / Sigungu dropdowns
function initSelectors() {
  const sidoSelect = document.getElementById('sido-select');
  const sigunguSelect = document.getElementById('sigungu-select');

  // Populate Sido
  Object.keys(REGIONS).forEach(sido => {
    const opt = document.createElement('option');
    opt.value = sido;
    opt.textContent = sido;
    sidoSelect.appendChild(opt);
  });

  // Sido change event
  sidoSelect.addEventListener('change', () => {
    sigunguSelect.innerHTML = '<option value="">선택하세요</option>';
    const selectedSido = sidoSelect.value;
    
    if (selectedSido) {
      sigunguSelect.disabled = false;
      const districts = REGIONS[selectedSido];
      Object.keys(districts).forEach(sigungu => {
        const opt = document.createElement('option');
        opt.value = districts[sigungu];
        opt.textContent = sigungu;
        sigunguSelect.appendChild(opt);
      });
    } else {
      sigunguSelect.disabled = true;
    }
  });
}

// Map initialization
function initMap() {
  const container = document.getElementById('kakao-map');
  
  if (useLeafletFallback) {
    // Initialize Leaflet Map
    leafletMap = L.map(container).setView([37.5665, 126.9780], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(leafletMap);
    
    // Update map description notice
    const noticeEl = document.querySelector('.map-notice');
    if (noticeEl) {
      noticeEl.innerHTML = `<i data-lucide="info"></i> 카카오맵 인증 오류로 <b>OpenStreetMap</b> 독립형 지도로 자동 전환되었습니다 (사용 제한 없음).`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    console.log('Leaflet Map fallback initialized successfully.');
    return;
  }
  
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780), // Seoul center
    level: 6 // Zoom level
  };
  
  // Create Kakao Map
  kakaoMap = new kakao.maps.Map(container, options);
  
  // Add zoom controls
  const zoomControl = new kakao.maps.ZoomControl();
  kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
}

// Function to generate realistic mock data on the client side when fetch/server fails
function generateClientMockData(lawdCd, dealYmd) {
  const year = dealYmd.substring(0, 4);
  const month = parseInt(dealYmd.substring(4, 6), 10);

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

  const list = [];
  // Generate 12 - 35 items
  const count = Math.floor(Math.random() * 24) + 12;
  for (let i = 0; i < count; i++) {
    const apt = aptNames[Math.floor(Math.random() * aptNames.length)] + ' ' + (Math.floor(Math.random() * 5) + 1) + '단지';
    const dong = activeDongs[Math.floor(Math.random() * activeDongs.length)];
    const size = parseFloat((59 + [0, 25, 55][Math.floor(Math.random() * 3)] + (Math.random() * 4 - 2)).toFixed(2));
    
    const sizeRatio = size / 84;
    const floor = Math.floor(Math.random() * 22) + 1;
    const floorPremium = 1 + (floor * 0.005);
    const buildYear = Math.floor(Math.random() * 22) + 2000;
    const ageDiscount = 1 - ((2026 - buildYear) * 0.006);
    
    const price = Math.floor(priceFactor * sizeRatio * floorPremium * ageDiscount * (0.9 + Math.random() * 0.2));
    const day = Math.floor(Math.random() * 28) + 1;
    const jibun = String(Math.floor(Math.random() * 950) + 1);
    const road = '중앙로';

    const dealDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    list.push({
      price,
      buildYear,
      dealDate,
      dealYear: parseInt(year, 10),
      dealMonth: month,
      dealDay: day,
      aptName: apt,
      area: size,
      dong,
      jibun,
      floor,
      road
    });
  }
  return list;
}

// Form submissions
function initFormListeners() {
  const form = document.getElementById('search-form');
  const loader = document.getElementById('loader-overlay');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const sigunguSelect = document.getElementById('sigungu-select');
    const lawdCd = sigunguSelect.value;
    const rawMonth = document.getElementById('deal-ymd').value; // YYYY-MM
    
    if (!lawdCd || !rawMonth) return;
    
    const dealYmd = rawMonth.replace('-', ''); // YYYYMM
    state.currentLawdCd = lawdCd;
    state.currentDealYmd = dealYmd;
    
    loader.style.display = 'flex';
    
    try {
      const response = await fetch(`/api/transactions?lawdCd=${lawdCd}&dealYmd=${dealYmd}`);
      if (!response.ok) {
        throw new Error('API server request failed');
      }
      
      const xmlText = await response.text();
      parseAndLoadData(xmlText);
      updateStatusBadge(xmlText);
      
    } catch (error) {
      console.warn('API / Server fetch failed, loading client-side simulation:', error);
      alert('데이터 서버에 연결할 수 없거나 API 요청이 만료되었습니다. 웹 브라우저 로컬 시뮬레이션 데이터를 로드합니다.');
      
      const mockList = generateClientMockData(lawdCd, dealYmd);
      state.allTransactions = mockList;
      state.filteredTransactions = [...mockList];
      state.currentPage = 1;
      state.sortField = 'dealDate';
      state.sortOrder = 'desc';
      
      // Update views
      document.getElementById('welcome-screen').style.display = 'none';
      document.getElementById('dashboard-widgets-wrapper').style.display = 'flex';
      document.getElementById('filter-options-panel').style.display = 'block';
      
      applyFiltersAndRender();
      
      // Update badge
      const badge = document.getElementById('api-status-badge');
      const dot = badge.querySelector('.status-dot');
      const txt = document.getElementById('api-status-text');
      dot.className = 'status-dot yellow';
      txt.textContent = '브라우저 로컬 시뮬레이션';
      
    } finally {
      loader.style.display = 'none';
    }
  });
}

// Update API connectivity badge
function updateStatusBadge(xmlText) {
  const badge = document.getElementById('api-status-badge');
  const dot = badge.querySelector('.status-dot');
  const txt = document.getElementById('api-status-text');
  
  if (xmlText.includes('FALLBACK MOCK DATA')) {
    dot.className = 'status-dot yellow';
    txt.textContent = '데모 시뮬레이션 작동 중';
  } else {
    dot.className = 'status-dot green';
    txt.textContent = '공공 API 정상 연결됨';
  }
}

// XML parser to Javascript Object
function parseAndLoadData(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const items = xmlDoc.getElementsByTagName('item');
  const list = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    const getVal = (tagName) => {
      const el = item.getElementsByTagName(tagName)[0];
      return el ? el.textContent.trim() : '';
    };
    
    const priceRaw = getVal('거래금액');
    const priceClean = priceRaw.replace(/,/g, '').trim();
    const price = parseInt(priceClean, 10);
    
    const buildYear = parseInt(getVal('건축년도'), 10) || 0;
    const dealYear = parseInt(getVal('년'), 10);
    const dealMonth = parseInt(getVal('월'), 10);
    const dealDay = parseInt(getVal('일'), 10);
    const aptName = getVal('아파트');
    const area = parseFloat(getVal('전용면적')) || 0;
    const dong = getVal('법정동');
    const jibun = getVal('지번');
    const floor = parseInt(getVal('층'), 10) || 0;
    const road = getVal('도로명');
    
    const dealDate = `${dealYear}-${String(dealMonth).padStart(2, '0')}-${String(dealDay).padStart(2, '0')}`;
    
    list.push({
      price,
      buildYear,
      dealDate,
      dealYear,
      dealMonth,
      dealDay,
      aptName,
      area,
      dong,
      jibun,
      floor,
      road
    });
  }
  
  // Populate state
  state.allTransactions = list;
  state.filteredTransactions = [...list];
  state.currentPage = 1;
  state.sortField = 'dealDate';
  state.sortOrder = 'desc';
  
  // UI views update
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('dashboard-widgets-wrapper').style.display = 'flex';
  document.getElementById('filter-options-panel').style.display = 'block';
  
  applyFiltersAndRender();
}

// Apply Filters, Sort and Update DOM Components
function applyFiltersAndRender() {
  const aptSearch = document.getElementById('filter-apt-name').value.toLowerCase();
  const areaFilter = document.getElementById('filter-area').value;
  
  // 1. Filter
  state.filteredTransactions = state.allTransactions.filter(item => {
    const matchesApt = item.aptName.toLowerCase().includes(aptSearch);
    
    let matchesArea = true;
    if (areaFilter === 'small') matchesArea = item.area <= 60;
    else if (areaFilter === 'medium') matchesArea = item.area > 60 && item.area <= 85;
    else if (areaFilter === 'large') matchesArea = item.area > 85;
    
    return matchesApt && matchesArea;
  });
  
  // 2. Sort
  sortData();
  
  // 3. Render Views
  renderMetrics();
  renderCharts();
  renderMap();
  renderTable();
}

// Data Sorting
function sortData() {
  const field = state.sortField;
  const isDesc = state.sortOrder === 'desc';
  
  state.filteredTransactions.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];
    
    if (field === 'dealDate') {
      valA = new Date(a.dealDate).getTime();
      valB = new Date(b.dealDate).getTime();
    }
    
    if (valA < valB) return isDesc ? 1 : -1;
    if (valA > valB) return isDesc ? -1 : 1;
    return 0;
  });
}

// Render Core KPI Cards
function renderMetrics() {
  const data = state.filteredTransactions;
  const count = data.length;
  
  if (count === 0) {
    document.getElementById('metric-total-count').textContent = '0건';
    document.getElementById('metric-avg-price').textContent = '-';
    document.getElementById('metric-max-price').textContent = '-';
    document.getElementById('metric-avg-unit-price').textContent = '-';
    return;
  }
  
  const totalPrice = data.reduce((acc, curr) => acc + curr.price, 0);
  const avgPrice = Math.round(totalPrice / count);
  const maxPrice = Math.max(...data.map(item => item.price));
  
  const totalUnitPrice = data.reduce((acc, curr) => acc + (curr.price / curr.area), 0);
  const avgUnitPrice = Math.round(totalUnitPrice / count); // 만원/㎡
  
  // Helper to format price in Korean Eok (억) and Man-won (만원)
  const formatKoreanPrice = (valInManwon) => {
    const eok = Math.floor(valInManwon / 10000);
    const man = valInManwon % 10000;
    
    if (eok > 0) {
      return `${eok}억 ${man > 0 ? man.toLocaleString() + '만' : ''}`;
    }
    return `${man.toLocaleString()}만원`;
  };
  
  document.getElementById('metric-total-count').textContent = `${count.toLocaleString()}건`;
  document.getElementById('metric-avg-price').textContent = formatKoreanPrice(avgPrice);
  document.getElementById('metric-max-price').textContent = formatKoreanPrice(maxPrice);
  document.getElementById('metric-avg-unit-price').textContent = `${(avgUnitPrice * 10).toLocaleString()}만원/3.3㎡`; // 3.3㎡ (평당가) conversion
}

// Render Chart.js graphs
function renderCharts() {
  const data = state.filteredTransactions;
  
  // --- Chart 1: Area Bracket Avg Price ---
  const areaBrackets = {
    '~60㎡ (소형)': { total: 0, count: 0 },
    '60~85㎡ (중형)': { total: 0, count: 0 },
    '85~115㎡ (대형)': { total: 0, count: 0 },
    '115㎡~ (초대형)': { total: 0, count: 0 }
  };
  
  data.forEach(item => {
    let bracket = '115㎡~ (초대형)';
    if (item.area <= 60) bracket = '~60㎡ (소형)';
    else if (item.area <= 85) bracket = '60~85㎡ (중형)';
    else if (item.area <= 115) bracket = '85~115㎡ (대형)';
    
    areaBrackets[bracket].total += item.price;
    areaBrackets[bracket].count++;
  });
  
  const bracketLabels = Object.keys(areaBrackets);
  const bracketValues = bracketLabels.map(key => {
    const b = areaBrackets[key];
    return b.count > 0 ? Math.round(b.total / b.count / 10000) : 0; // In Eok (억)
  });
  
  const ctx1 = document.getElementById('chart-area-price').getContext('2d');
  if (areaPriceChart) areaPriceChart.destroy();
  
  areaPriceChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: bracketLabels,
      datasets: [{
        label: '평균 매매가 (억원)',
        data: bracketValues,
        backgroundColor: [
          'rgba(59, 130, 246, 0.65)',
          'rgba(99, 102, 241, 0.65)',
          'rgba(168, 85, 247, 0.65)',
          'rgba(234, 179, 8, 0.65)'
        ],
        borderColor: [
          '#3b82f6',
          '#6366f1',
          '#a855f7',
          '#eab308'
        ],
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) { return `${context.raw} 억원`; }
          }
        }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af' }
        }
      }
    }
  });

  // --- Chart 2: Daily Transaction Volume ---
  // Create mapping of days (1-31)
  const dailyVol = {};
  for (let i = 1; i <= 31; i++) dailyVol[i] = 0;
  
  data.forEach(item => {
    dailyVol[item.dealDay] = (dailyVol[item.dealDay] || 0) + 1;
  });
  
  const dailyLabels = Object.keys(dailyVol).map(d => `${d}일`);
  const dailyValues = Object.values(dailyVol);
  
  const ctx2 = document.getElementById('chart-daily-volume').getContext('2d');
  if (dailyVolumeChart) dailyVolumeChart.destroy();
  
  dailyVolumeChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: dailyLabels,
      datasets: [{
        label: '거래량',
        data: dailyValues,
        fill: true,
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderColor: '#06b6d4',
        borderWidth: 2,
        tension: 0.35,
        pointBackgroundColor: '#06b6d4'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af', stepSize: 1 },
          beginAtZero: true
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af', maxTicksLimit: 10 }
        }
      }
    }
  });
}

// Hashing algorithm for stable mapping coordinates
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getApartmentCoords(aptName, centerCoords) {
  const hash = hashString(aptName);
  // Jitter offset around center coords (between -0.012 and +0.012 degrees)
  const latJitter = ((hash % 100) / 100) * 0.024 - 0.012;
  const lngJitter = (((hash >> 8) % 100) / 100) * 0.024 - 0.012;
  return [centerCoords[0] + latJitter, centerCoords[1] + lngJitter];
}

// Helper to clear existing markers and infowindows
function clearMarkers() {
  if (useLeafletFallback) {
    if (leafletMarkers) {
      leafletMarkers.forEach(marker => leafletMap.removeLayer(marker));
    }
    leafletMarkers = [];
    return;
  }

  if (kakaoMarkers) {
    for (let marker of kakaoMarkers) {
      marker.setMap(null);
    }
  }
  kakaoMarkers = [];
  if (kakaoActiveInfoWindow) {
    kakaoActiveInfoWindow.close();
    kakaoActiveInfoWindow = null;
  }
}

// Render Map markers using Geocoding or Leaflet fallback
function renderMap() {
  const sidebarList = document.getElementById('map-apt-list');
  sidebarList.innerHTML = '';

  if (useLeafletFallback) {
    renderLeafletMap(sidebarList);
    return;
  }

  if (!kakaoMap) {
    console.warn('Kakao Map is not loaded. Skipping marker rendering.');
    toggleDiagnosticsOverlay();
    const li = document.createElement('li');
    li.style.color = '#ef4444';
    li.style.padding = '12px';
    li.style.background = 'rgba(239, 68, 68, 0.1)';
    li.style.borderRadius = '8px';
    li.style.margin = '10px';
    li.style.border = '1px solid rgba(239, 68, 68, 0.2)';
    li.innerHTML = `
      <strong style="display: block; margin-bottom: 4px;">지도를 로드할 수 없습니다</strong>
      <span style="font-size: 11px; line-height: 1.4; color: #f87171; display: block;">
        우측 지도의 진단 패널 정보를 참고하여 카카오 설정을 확인해 주세요.
      </span>
    `;
    sidebarList.appendChild(li);
    return;
  }

  // Clear old markers
  clearMarkers();
  
  const data = state.filteredTransactions;
  
  if (data.length === 0) return;
  
  // Center coordinates for map
  let centerCoords = SIDO_COORDS[state.currentLawdCd.substring(0, 2)] || [37.5665, 126.9780];
  if (SIGUNGU_COORDS[state.currentLawdCd]) {
    centerCoords = SIGUNGU_COORDS[state.currentLawdCd];
  }
  
  const moveLatLng = new kakao.maps.LatLng(centerCoords[0], centerCoords[1]);
  kakaoMap.setCenter(moveLatLng);
  kakaoMap.setLevel(6);
  
  // Group transactions by apartment name to place single marker per building
  const aptGroup = {};
  data.forEach(item => {
    if (!aptGroup[item.aptName]) {
      aptGroup[item.aptName] = {
        name: item.aptName,
        transactions: [],
        dong: item.dong,
        jibun: item.jibun,
        buildYear: item.buildYear,
        road: item.road
      };
    }
    aptGroup[item.aptName].transactions.push(item);
  });
  
  const geocoder = new kakao.maps.services.Geocoder();
  const sidoSelect = document.getElementById('sido-select');
  const sigunguSelect = document.getElementById('sigungu-select');
  const selectedSido = sidoSelect.value;
  const selectedSigungu = sigunguSelect.options[sigunguSelect.selectedIndex].text;
  
  // Create markers and sidebar elements
  Object.values(aptGroup).forEach((apt) => {
    const avgPrice = Math.round(apt.transactions.reduce((acc, curr) => acc + curr.price, 0) / apt.transactions.length);
    const volume = apt.transactions.length;
    
    // Construct clean query address (e.g. "서울특별시 강남구 대치동 503")
    const cleanJibun = apt.jibun ? ' ' + apt.jibun : '';
    const addressQuery = `${selectedSido} ${selectedSigungu} ${apt.dong}${cleanJibun}`;
    
    // Define marker placing function (called once geocode succeeds or falls back)
    const placeMarkerOnMap = (lat, lng) => {
      const markerPosition = new kakao.maps.LatLng(lat, lng);
      
      const marker = new kakao.maps.Marker({
        position: markerPosition
      });
      marker.setMap(kakaoMap);
      kakaoMarkers.push(marker);
      
      const formattedPrice = (avgPrice / 10000).toFixed(2); // 억원
      const displayPrice = formattedPrice.endsWith('.00') ? `${Math.floor(avgPrice / 10000)}억` : `${formattedPrice}억`;
      
      // Popup Infowindow HTML
      const iwContent = `
        <div style="padding: 10px; font-family: var(--font-body); font-size: 12px; line-height: 1.5; color: #1e293b; min-width: 180px;">
          <h4 style="margin: 0 0 4px 0; color: #6366f1; font-weight: 700; font-size: 13px;">${apt.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">${apt.dong} | 준공 ${apt.buildYear}년</p>
          <p style="margin: 0 0 2px 0;"><b>평균가:</b> ${displayPrice}</p>
          <p style="margin: 0;"><b>거래량:</b> ${volume}건</p>
        </div>
      `;
      
      const infowindow = new kakao.maps.InfoWindow({
        content: iwContent,
        removable: true
      });
      
      kakao.maps.event.addListener(marker, 'click', () => {
        if (kakaoActiveInfoWindow) {
          kakaoActiveInfoWindow.close();
        }
        infowindow.open(kakaoMap, marker);
        kakaoActiveInfoWindow = infowindow;
      });
      
      // Connect click listener to sidebar item
      li.addEventListener('click', () => {
        document.querySelectorAll('.map-apt-item').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        
        kakaoMap.panTo(markerPosition);
        
        if (kakaoActiveInfoWindow) {
          kakaoActiveInfoWindow.close();
        }
        infowindow.open(kakaoMap, marker);
        kakaoActiveInfoWindow = infowindow;
      });
    };
    
    // Sidebar list element creation (async rendering safe)
    const li = document.createElement('li');
    li.className = 'map-apt-item';
    li.innerHTML = `
      <strong>${apt.name}</strong>
      <span class="sub-info">${apt.dong} | 평균 ${(avgPrice / 10000).toFixed(1)}억 (${volume}건)</span>
    `;
    sidebarList.appendChild(li);
    
    // Trigger asynchronous address search
    geocoder.addressSearch(addressQuery, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        // Success: Place marker at the exact geocoded location
        placeMarkerOnMap(parseFloat(result[0].y), parseFloat(result[0].x));
      } else {
        // Fallback: Place marker using deterministic coordinate jitter centered around Sigungu center
        const coords = getApartmentCoords(apt.name, centerCoords);
        placeMarkerOnMap(coords[0], coords[1]);
      }
    });
  });
}

// Render data table rows and handle pagination
function renderTable() {
  const tbody = document.getElementById('transaction-rows');
  tbody.innerHTML = '';
  
  const data = state.filteredTransactions;
  const count = data.length;
  
  document.getElementById('table-showing-count').textContent = `총 ${state.allTransactions.length.toLocaleString()}건 중 ${count.toLocaleString()}건 필터링됨`;
  
  if (count === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 40px 0;">조건에 해당하는 거래 내역이 없습니다.</td></tr>';
    document.getElementById('table-pagination').innerHTML = '';
    return;
  }
  
  // Paginate details
  const startIdx = (state.currentPage - 1) * state.rowsPerPage;
  const endIdx = Math.min(startIdx + state.rowsPerPage, count);
  const paginatedData = data.slice(startIdx, endIdx);
  
  paginatedData.forEach(item => {
    const tr = document.createElement('tr');
    
    const formattedPrice = (item.price / 10000).toFixed(2); // 억원
    const displayPrice = formattedPrice.endsWith('.00') ? `${Math.floor(item.price / 10000)}억` : `${formattedPrice}억`;
    
    tr.innerHTML = `
      <td>
        <strong>${item.dealDate}</strong>
        <span class="sub-info">${item.dealDate.substring(5, 7)}월 ${item.dealDay}일</span>
      </td>
      <td>
        <span class="apt-title">${item.aptName}</span>
        <span class="sub-info">${item.road ? item.road + ' | ' : ''}지번: ${item.jibun}</span>
      </td>
      <td>
        <strong>${item.area.toFixed(2)}㎡</strong>
        <span class="sub-info">평형: ~${Math.round(item.area / 3.3)}평</span>
      </td>
      <td>
        <span class="price-highlight">${displayPrice}</span>
        <span class="sub-info">${item.price.toLocaleString()}만원</span>
      </td>
      <td>
        <strong>${item.floor}층</strong>
        <span class="sub-info">${item.buildYear}년 준공</span>
      </td>
      <td>
        <span>${item.dong}</span>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  renderPagination(count);
}

// Render pagination control buttons
function renderPagination(totalRows) {
  const wrapper = document.getElementById('table-pagination');
  wrapper.innerHTML = '';
  
  const totalPages = Math.ceil(totalRows / state.rowsPerPage);
  if (totalPages <= 1) return;
  
  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.innerHTML = '&laquo;';
  prevBtn.disabled = state.currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderTable();
    }
  });
  wrapper.appendChild(prevBtn);
  
  // Pages buttons
  // Limit shown page buttons around active
  const startPage = Math.max(1, state.currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${state.currentPage === i ? 'active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      state.currentPage = i;
      renderTable();
    });
    wrapper.appendChild(btn);
  }
  
  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.innerHTML = '&raquo;';
  nextBtn.disabled = state.currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderTable();
    }
  });
  wrapper.appendChild(nextBtn);
}

// Tab navigation handler
function initTabListeners() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active classes
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      // Add active classes to targets
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      targetContent.classList.add('active');
      
      // In case Map needs size recalculation due to hidden tab rendering
      if (targetId === 'tab-map') {
        setTimeout(() => {
          let centerCoords = SIDO_COORDS[state.currentLawdCd.substring(0, 2)] || [37.5665, 126.9780];
          if (SIGUNGU_COORDS[state.currentLawdCd]) {
            centerCoords = SIGUNGU_COORDS[state.currentLawdCd];
          }
          if (kakaoMap) {
            kakaoMap.relayout();
            kakaoMap.setCenter(new kakao.maps.LatLng(centerCoords[0], centerCoords[1]));
          } else if (leafletMap) {
            leafletMap.invalidateSize();
            leafletMap.setView(centerCoords, 13);
          }
        }, 100);
      }
    });
  });
}

// Text filter and area dropdown listeners
function initFilterListeners() {
  const aptSearch = document.getElementById('filter-apt-name');
  const areaFilter = document.getElementById('filter-area');
  
  aptSearch.addEventListener('input', () => {
    state.currentPage = 1;
    applyFiltersAndRender();
  });
  
  areaFilter.addEventListener('change', () => {
    state.currentPage = 1;
    applyFiltersAndRender();
  });
  
  // Export CSV Listener
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    exportToCSV();
  });
}

// Sorting logic on table headers click
function initSortListeners() {
  const headers = document.querySelectorAll('.data-table th.sortable');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const field = header.getAttribute('data-sort');
      
      // Reset lucide icon layouts
      headers.forEach(h => {
        const icon = h.querySelector('.sort-icon');
        icon.className = 'sort-icon';
        icon.setAttribute('data-lucide', 'arrow-up-down');
      });
      
      if (state.sortField === field) {
        // Toggle direction
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortField = field;
        state.sortOrder = 'desc';
      }
      
      // Apply icon arrow orientation
      const icon = header.querySelector('.sort-icon');
      if (state.sortOrder === 'desc') {
        icon.className = 'sort-icon desc';
        icon.setAttribute('data-lucide', 'arrow-down-narrow-wide');
      } else {
        icon.className = 'sort-icon asc';
        icon.setAttribute('data-lucide', 'arrow-up-narrow-wide');
      }
      
      // Rerender lucide icons
      lucide.createIcons();
      
      state.currentPage = 1;
      applyFiltersAndRender();
    });
  });
}

// Export parsed table as comma-separated CSV file
function exportToCSV() {
  const data = state.filteredTransactions;
  if (data.length === 0) return;
  
  const headers = ['거래일자', '법정동', '아파트명', '전용면적(㎡)', '거래금액(만원)', '층', '건축년도'];
  const rows = data.map(item => [
    item.dealDate,
    item.dong,
    item.aptName,
    item.area,
    item.price,
    item.floor,
    item.buildYear
  ]);
  
  // Build file content
  // Adding BOM for excel support on UTF-8 in Korean characters
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
  
  // Download action
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `아파트실거래가_${state.currentLawdCd}_${state.currentDealYmd}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Render Leaflet fallback map
function renderLeafletMap(sidebarList) {
  // Clear old markers
  clearMarkers();
  
  const data = state.filteredTransactions;
  if (data.length === 0) return;
  
  // Center coordinates for map
  let centerCoords = SIDO_COORDS[state.currentLawdCd.substring(0, 2)] || [37.5665, 126.9780];
  if (SIGUNGU_COORDS[state.currentLawdCd]) {
    centerCoords = SIGUNGU_COORDS[state.currentLawdCd];
  }
  
  leafletMap.setView(centerCoords, 13);
  
  // Group transactions by apartment name
  const aptGroup = {};
  data.forEach(item => {
    if (!aptGroup[item.aptName]) {
      aptGroup[item.aptName] = {
        name: item.aptName,
        transactions: [],
        dong: item.dong,
        jibun: item.jibun,
        buildYear: item.buildYear,
        road: item.road
      };
    }
    aptGroup[item.aptName].transactions.push(item);
  });
  
  // Create markers and sidebar elements
  Object.values(aptGroup).forEach((apt) => {
    const avgPrice = Math.round(apt.transactions.reduce((acc, curr) => acc + curr.price, 0) / apt.transactions.length);
    const volume = apt.transactions.length;
    
    const formattedPrice = (avgPrice / 10000).toFixed(2);
    const displayPrice = formattedPrice.endsWith('.00') ? `${Math.floor(avgPrice / 10000)}억` : `${formattedPrice}억`;
    
    // Sidebar list element
    const li = document.createElement('li');
    li.className = 'map-apt-item';
    li.innerHTML = `
      <strong>${apt.name} <span style="font-size: 9px; background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 4px; border-radius: 4px; margin-left: 4px;">OSM</span></strong>
      <span class="sub-info">${apt.dong} | 평균 ${(avgPrice / 10000).toFixed(1)}억 (${volume}건)</span>
    `;
    sidebarList.appendChild(li);
    
    // Generate simulated coordinates
    const coords = getApartmentCoords(apt.name, centerCoords);
    
    // Add Leaflet marker
    const marker = L.marker(coords).addTo(leafletMap);
    
    // Popup content
    const popupContent = `
      <div style="font-family: var(--font-body), sans-serif; font-size: 12px; line-height: 1.5; color: #1e293b; min-width: 160px; padding: 2px;">
        <h4 style="margin: 0 0 4px 0; color: #6366f1; font-weight: 700; font-size: 13px;">${apt.name}</h4>
        <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">${apt.dong} | 준공 ${apt.buildYear}년</p>
        <p style="margin: 0 0 2px 0;"><b>평균가:</b> ${displayPrice}</p>
        <p style="margin: 0;"><b>거래량:</b> ${volume}건</p>
      </div>
    `;
    marker.bindPopup(popupContent);
    leafletMarkers.push(marker);
    
    // Sidebar click zooms & pans and opens popup
    li.addEventListener('click', () => {
      document.querySelectorAll('.map-apt-item').forEach(el => el.classList.remove('active'));
      li.classList.add('active');
      leafletMap.panTo(coords);
      marker.openPopup();
    });
  });
}
