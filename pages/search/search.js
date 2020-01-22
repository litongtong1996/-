let timeId = null;
Page({
  data: {
    history: [],
    hot: ['新鲜芹菜', '大红枣', '滋补桂圆干'],
    result: [{
        id: 1,
        url: '../goods-detail/goods-detail?id=243183',
        thumb: 'https://cdn.it120.cc/apifactory/2018/09/14/5a707b7739e8d919befe66b62017940e.jpg_m',
        title: '苹果X',
        price: 6999
      },
      {
        id: 2,
        url: '../goods-detail/goods-detail?id=243178',
        thumb: 'https://cdn.it120.cc/apifactory/2018/09/14/eea2d128fb576c39e30e9b5b85f29b7e.jpg_m',
        title: '小米max',
        price: 1111
      }
    ],
    showKeywords: false,
    keywords: ['山东肚脐橙', '湖南冰糖橙', '麻涌香蕉', '冰糖心苹果'],
    value: '',
    showResult: false,
  },
  cancelSearch() {
    this.setData({
      showResult: false,
      showKeywords: false,
      value: ''
    })
  },
  searchInput(e) {
    if (!e.detail.value) {
      this.setData({
        showKeywords: false
      })
    } else {
      if (!this.data.showKeywords) {
        timeId && clearTimeout(timeId);
        timeId = setTimeout(() => {
          this.setData({
            showKeywords: true
          })
        }, 1000)
      }
    }
  },
  keywordHandle(e) {
    const text = e.target.dataset.text;
    this.setData({
      value: text,
      showKeywords: false,
      showResult: true
    })
    this.historyHandle(text);
  },
  historyHandle(value) {
    let history = this.data.history;
    const idx = history.indexOf(value);
    if (idx === -1) {
      // 搜索记录只保留8个
      if (history.length > 7) {
        history.pop();
      }
    } else {
      history.splice(idx, 1);
    }
    history.unshift(value);
    wx.setStorageSync('history', JSON.stringify(history));
    this.setData({
      history
    });
  },
  onLoad() {
    const history = wx.getStorageSync('history');
    if (history) {
      this.setData({
        history: JSON.parse(history)
      })
      console.log(this.data.history);
    }
  }
})