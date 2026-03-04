export const ModernHouseBridge = {
  fetchQuery: () => {
    return `
      select=*,
      daily_rankings_v2!inner(rank, date, category_code)
      &daily_rankings_v2.date=eq.${new Date().toISOString().split('T')[0]}
      &source=eq.modernhouse_best
      &order=rank.asc.daily_rankings_v2
    `;
  },

  getAllCategories: () => [
    { name: '전체', code: 'all' },
    { name: '패브릭', code: '038' },
    { name: '주방', code: '039' },
    { name: '데코/취미', code: '040' },
    { name: '키즈', code: '042' },
    { name: '펫', code: '043' },
    { name: '가전', code: '044' },
    { name: '욕실/청소', code: '045' },
    { name: '외부상품', code: '158' }
  ],

  mapData: (rows) => {
    return rows.map(r => ({
      ...r,
      platform: 'modernhouse', // UI helper
      rank: r.daily_rankings_v2 && r.daily_rankings_v2.length > 0 ? r.daily_rankings_v2[0].rank : null,
      price: r.price !== null ? r.price : 0, 
      product_url: r.url
    }));
  }
};
