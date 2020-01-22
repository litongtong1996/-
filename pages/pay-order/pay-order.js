//index.js
//获取应用实例
const app = getApp()
const WXAPI = require('apifm-wxapi')
const CONFIG = require('../../config')
const wxpay = require('../../utils/pay.js');
// import {
// 	$wuxDialog
// } from 'wux-weapp'
Page({
	data: {
		goodsList: [],
		isNeedLogistics: 0, // 是否需要物流信息
		allGoodsPrice: 0,
		yunPrice: 0,
		allGoodsAndYunPrice: 0,
		goodsJsonStr: "",
		orderType: "", //订单类型，购物车下单或立即支付下单，默认是购物车，
		hasNoCoupons: true,
		coupons: [],
		youhuijine: 0, //优惠券金额
		curCoupon: null, // 当前选择使用的优惠券
		isHidden: true,
		token: null,
	},
	showAuth() {
		this.setData({
			isHidden: false
		})
	},
	/*
	 *授权登录成功后回调
	 */
	afterAuth(e) {
		this.setData({
			isHidden: true,
			token: e.detail
		})
		this.initShippingAddress();
	},
	onShow: function() {
		//console.log(this.data.orderType)
		var that = this;
		var shopList = [];

		//立即购买下单
		if ("buyNow" == that.data.orderType) {
			var buyNowInfoMem = wx.getStorageSync('buyNowInfo');
			if (buyNowInfoMem && buyNowInfoMem.shopList) {
				shopList = buyNowInfoMem.shopList
			}
		} else {
			//购物车下单
			var shopCarInfoMem = wx.getStorageSync('shopCarInfo');
			if (shopCarInfoMem && shopCarInfoMem.shopList) {
				// shopList = shopCarInfoMem.shopList
				shopList = shopCarInfoMem.shopList.filter(entity => {
					return entity.active;
				});
			}
		}
		that.setData({
			goodsList: shopList,
		});
	},

	onLoad: function(e) {
		//console.log(e)
		var that = this;
		if (app.globalData.iphone == true) {
			that.setData({
				iphone: 'iphone'
			})
		}
		//显示收货地址标识
		that.setData({
			isNeedLogistics: 1,
			orderType: e.orderType
		});
	},

	getDistrictId: function(obj, aaa) {
		if (!obj) {
			return "";
		}
		if (!aaa) {
			return "";
		}
		return aaa;
	},

	createOrder: function(e) {
		wx.showLoading();
		const loginToken = this.data.token // 用户登录 token
		let remark = ""; // 备注信息
		if (e) {
			remark = e.detail.value.remark; // 备注信息
		}
		/* 备注信息必填
		if (e && that.data.orderType == 'buykj' && remark == '') {
		  wx.hideLoading();
		  wx.showModal({
		    title: '提示',
		    content: '请添加备注信息！',
		    showCancel: false
		  })
		  return;
		}
		*/
		let postData = {
			token: loginToken,
			goodsJsonStr: this.data.goodsJsonStr,
			remark: remark
		};
		if (this.data.isNeedLogistics > 0) {
			if (!this.data.curAddressData) {
				wx.hideLoading();
				wx.showModal({
					title: '友情提示',
					content: '请先设置您的收货地址！',
					showCancel: false
				})
				return;
			}
			// if ("buyPT" == this.data.orderType) {
			// 	postData.pingtuanOpenId = this.data.goodsList[0].pingtuanId;
			// } else if ("buykj" == this.data.orderType) {
			// 	postData.kjid = this.data.goodsList[0].kjid
			// }

			postData.provinceId = this.data.curAddressData.provinceId;
			postData.cityId = this.data.curAddressData.cityId;
			if (this.data.curAddressData.districtId) {
				postData.districtId = this.data.curAddressData.districtId;
			}
			postData.address = this.data.curAddressData.address;
			postData.linkMan = this.data.curAddressData.linkMan;
			postData.mobile = this.data.curAddressData.mobile;
			postData.code = this.data.curAddressData.code;
			postData.expireMinutes = CONFIG.orderExpireTime;
		}
		if (this.data.curCoupon) {
			postData.couponId = this.data.curCoupon.id;
		}
		if (!e) {
			postData.calculate = "true";
		}
		WXAPI.orderCreate(postData).then(res => {
			wx.hideLoading();
			console.log(res)
			if (res.code != 0) {
				wx.showModal({
					title: '错误',
					content: res.msg,
					showCancel: false
				})
				return;
			}

			if (e && "buyNow" != this.data.orderType) {
				// 清空购物车数据
				wx.removeStorageSync('shopCarInfo');
				// wx.removeStorageSync('buykjInfo');
				// wx.removeStorageSync('PingTuanInfo');
			}

			if (!e) {
				let allGoodsAndYunPrice = res.data.amountLogistics + res.data.amountTotle

				this.setData({
					isNeedLogistics: res.data.isNeedLogistics,
					allGoodsPrice: res.data.amountTotle,
					allGoodsAndYunPrice: allGoodsAndYunPrice, //res.data.data.amountLogistics + res.data.data.amountTotle,
					yunPrice: res.data.amountLogistics
				});
				this.getMyCoupons();
				return;
			}
			// 配置模板消息推送
			let postJsonString = {};
			postJsonString.keyword1 = {
				value: res.data.dateAdd,
				color: '#173177'
			}
			postJsonString.keyword2 = {
				value: res.data.amountReal + '元',
				color: '#173177'
			}
			postJsonString.keyword3 = {
				value: res.data.orderNumber,
				color: '#173177'
			}
			postJsonString.keyword4 = {
				value: '订单已关闭',
				color: '#173177'
			}
			postJsonString.keyword5 = {
				value: '您可以重新下单，请在' + CONFIG.orderExpireTime + '分钟内完成支付',
				color: '#173177'
			}
			app.sendTempleMsg(res.data.id, -1,
				CONFIG.closeOrderkey, e.detail.formId,
				'pages/index/index', JSON.stringify(postJsonString));
			postJsonString = {};
			postJsonString.keyword1 = {
				value: '您的订单已发货，请注意查收',
				color: '#173177'
			}
			postJsonString.keyword2 = {
				value: res.data.orderNumber,
				color: '#173177'
			}
			postJsonString.keyword3 = {
				value: res.data.dateAdd,
				color: '#173177'
			}
			app.sendTempleMsg(res.data.id, 2,
				CONFIG.deliveryOrderkey, e.detail.formId,
				'pages/order-detail/order-detail?id=' + res.data.id, JSON.stringify(postJsonString));
			// $wuxDialog().confirm({
			// 	title: '订单支付确认',
			// 	content: '您的订单金额为' + res.data.amountReal + '元',
			// 	confirmText: '微信支付',
			// 	onConfirm(e) {
			// 		console.log(e)
			// 		wxpay.wxpay('order', res.data.amountReal, res.data.id, "/pages/order-list/order-list?currentType=1&share=1");
			// 	},
			// 	onCancel(e) {
			// 		wx.navigateTo({
			// 			url:'/pages/order-list/order-list?currentType=0'
			// 		})
			// 	}
			// })
			// wx.redirectTo({
			// 	url: "/pages/success/success?order=" + res.data.orderNumber + "&money=" + res.data.amountReal +
			// 		"&id=" + res.data.id
			// });
		})
	},
	initShippingAddress: function() {
		WXAPI.defaultAddress(this.data.token).then(res => {
			console.log(res)
			if (res.code == 0) {
				this.setData({
					curAddressData: res.data.info
				});
			} else {
				this.setData({
					isHidden: false,
					curAddressData: null
				});
			}
			this.processYunfei();
		})
	},
	processYunfei: function() {
		const that = this;
		let goodsList = this.data.goodsList;
		let goodsJsonStr = "[";
		let isNeedLogistics = 0;
		let allGoodsPrice = 0;

		for (let i = 0; i < goodsList.length; i++) {
			let carShopBean = goodsList[i];
			if (carShopBean.logistics) {
				isNeedLogistics = 1;
			}
			allGoodsPrice += carShopBean.price * carShopBean.number;

			let goodsJsonStrTmp = '';
			if (i > 0) {
				goodsJsonStrTmp = ",";
			}


			let inviter_id = 0;
			let inviter_id_storge = wx.getStorageSync('inviter_id_' + carShopBean.goodsId);
			if (inviter_id_storge) {
				inviter_id = inviter_id_storge;
			}


			goodsJsonStrTmp += '{"goodsId":' + carShopBean.goodsId + ',"number":' + carShopBean.number +
				',"propertyChildIds":"' + carShopBean.propertyChildIds + '","logisticsType":0, "inviter_id":' + inviter_id + '}';
			goodsJsonStr += goodsJsonStrTmp;


		}
		goodsJsonStr += "]";
		//console.log(goodsJsonStr);
		that.setData({
			isNeedLogistics: isNeedLogistics,
			goodsJsonStr: goodsJsonStr
		});
		that.createOrder();
	},
	addAddress: function() {
		wx.navigateTo({
			url: "/pages/address-add/address-add"
		})
	},
	selectAddress: function() {
		wx.navigateTo({
			url: "/pages/address/address"
		})
	},
	getMyCoupons: function() {
		WXAPI.myCoupons({
			token: this.data.token,
			status: 0
		}).then(res => {
			console.log(res)
			if (res.code == 0) {
				let coupons = res.data.filter(entity => {
					return entity.moneyHreshold <= this.data.allGoodsAndYunPrice;
				});
				if (coupons.length > 0) {
					this.setData({
						hasNoCoupons: false,
						coupons: coupons
					});
				}
			}
		}).catch(res => {
			console.log(res)
		})
		// var that = this;
		// wx.request({
		// 	url: app.globalData.urls + '/discounts/my',
		// 	data: {
		// 		token: app.globalData.token,
		// 		status: 0
		// 	},
		// 	success: function(res) {
		// 		if (res.data.code == 0) {
		// 			var coupons = res.data.data.filter(entity => {
		// 				return entity.moneyHreshold <= that.data.allGoodsAndYunPrice;
		// 			});
		// 			if (coupons.length > 0) {
		// 				that.setData({
		// 					hasNoCoupons: false,
		// 					coupons: coupons
		// 				});
		// 			}
		// 		}
		// 	}
		// })
	},
	bindChangeCoupon: function(e) {
		const selIndex = e.detail.value[0] - 1;
		if (selIndex == -1) {
			this.setData({
				youhuijine: 0,
				curCoupon: null
			});
			return;
		}
		//console.log("selIndex:" + selIndex);
		this.setData({
			youhuijine: this.data.coupons[selIndex].money,
			curCoupon: this.data.coupons[selIndex]
		});
	}
})
