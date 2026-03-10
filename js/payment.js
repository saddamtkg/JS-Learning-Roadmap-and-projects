/**
 * payment.js — Payment page logic (amount, currency, method, mode, submit).
 * -----------------------------------------------
 * প্রতিটি ব্লক ও গুরুত্বপূর্ণ লাইনের নিচে কমেন্টে লেখা আছে:
 *   - কোড কী করছে (কিভাবে কাজ করছে)
 *   - কোথায় কোন Payment API যোগ / কল করতে হবে (Stripe, PayPal, mobile banking, bank, etc.)
 * অন্য সাইটে কপি করার পর শুধু API integration অংশগুলো আপনার ব্যাকএন্ড/প্রোভাইডার দিয়ে পূরণ করুন।
 *
 * -----------------------------------------------
 * কোথায় কী যোগ করবেন (সব কমেন্ট ইংরেজিতে, সহজে খুঁজতে গrep করুন "API INTEGRATION")
 * -----------------------------------------------
 * 1) API Keys / Config
 *    → payment-config.js: stripePublishableKey, paypalClientId, apiEndpoints.createPaymentIntent, createOrder, captureOrder
 *
 * 2) Stripe (কার্ড)
 *    → showMethodDetails(): card সিলেক্ট হলে Stripe.js লোড করে Elements এই elMethodDetailsContent এ mount করুন।
 *    → handleSubmit(): ব্যাকএন্ডে createPaymentIntent কল করে clientSecret নিন; Stripe.confirmCardPayment(clientSecret, ...) করুন।
 *
 * 3) PayPal
 *    → showMethodDetails(): paypal সিলেক্ট হলে PayPal SDK লোড করে #paypal-button-container এ বাটন রেন্ডার করুন; createOrder/captureOrder আপনার ব্যাকএন্ডে কল করুন।
 *
 * 4) মোবাইল ব্যাংকিং / ব্যাংক ট্রান্সফার
 *    → showMethodDetails(): আপনার প্রোভাইডার (bKash, Nagad, Razorpay, Paystack) স크립্ট ও ফর্ম/ইনস্ট্রাকশন যোগ করুন।
 *    → handleSubmit(): ঐ প্রোভাইডার API বা ব্যাকএন্ড কল করুন।
 * -----------------------------------------------
 */

(function () {
    'use strict';

    // =========================================================================
    // CONFIG — payment-config.js থেকে পড়া; না থাকলে ডিফল্ট
    // =========================================================================
    // PAYMENT_CONFIG এ আপনার API keys, currencies, paymentMethods আছে।
    // API keys যোগ করুন payment-config.js এ (stripePublishableKey, paypalClientId, etc.)
    const CONFIG = window.PAYMENT_CONFIG || {};
    const CURRENCIES = CONFIG.currencies || [{ code: 'USD', label: 'USD', default: true }];
    const PAYMENT_METHODS = (CONFIG.paymentMethods || []).filter(function (m) { return m.enabled; });
    const MIN_AMOUNT = typeof CONFIG.minAmount === 'number' ? CONFIG.minAmount : 1;
    const DEFAULT_MODE = CONFIG.defaultMode || 'product';

    // =========================================================================
    // STATE — বর্তমান সিলেকশন ও ভ্যালিডেশন
    // =========================================================================
    // mode: 'product' | 'donation' | 'subscription' — কিসের জন্য পেমেন্ট (API কলে এই ভ্যালু ব্যাকএন্ডে পাঠাবেন)
    let currentMode = DEFAULT_MODE;
    // selectedMethodId: 'card' | 'paypal' | 'mobile_banking' | 'bank_transfer' — কোন মেথড সিলেক্ট
    let selectedMethodId = null;
    // selectedMethodObj: config object of the selected method (provider, id, label) — API কল করার সময় কোন provider use করতে হবে সেটা এখান থেকে নেবেন
    let selectedMethodObj = null;

    // =========================================================================
    // DOM REFERENCES — একবার লোডে রেফারেন্স নিয়ে রাখা যাতে বারবার querySelector না করতে হয়
    // =========================================================================
    let elAmount = null;
    let elCurrency = null;
    let elMethodsContainer = null;
    let elMethodDetailsSection = null;
    let elMethodDetailsContent = null;
    let elSummaryText = null;
    let elSubmitBtn = null;
    let elMessage = null;

    /** Bangladesh free API: BDT exchange rate (1 USD = X BDT). Fetched from fawazahmed0/currency-api. */
    let bdtRatePerUsd = null;

    /**
     * DOM elements খুঁজে রেফারেন্স সেট করা।
     * init() থেকে একবার কল হয়; এর পর সব ফাংশন এই রেফারেন্স ব্যবহার করে।
     */
    function cacheDOMElements() {
        elAmount = document.getElementById('payment-amount');
        elCurrency = document.getElementById('payment-currency');
        elMethodsContainer = document.getElementById('payment-methods-container');
        elMethodDetailsSection = document.getElementById('method-details-section');
        elMethodDetailsContent = document.getElementById('method-details-content');
        elSummaryText = document.getElementById('payment-summary-text');
        elSubmitBtn = document.getElementById('payment-submit-btn');
        elMessage = document.getElementById('payment-message');
    }

    /**
     * Bangladesh free API — fawazahmed0 currency-api (no key, no limit).
     * Fetches 1 USD = X BDT from: https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json
     * Response: { date: "...", usd: { bdt: 110.5, eur: 0.92, ... } } so usd.bdt = BDT per 1 USD.
     */
    function fetchBdtRate() {
        var loadingEl = document.getElementById('bdt-rate-loading');
        var valueEl = document.getElementById('bdt-rate-value');
        var errorEl = document.getElementById('bdt-rate-error');
        if (!valueEl || !errorEl) return;
        if (loadingEl) loadingEl.classList.remove('hidden');
        valueEl.classList.add('hidden');
        errorEl.classList.add('hidden');
        var url = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';
        fetch(url)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (loadingEl) loadingEl.classList.add('hidden');
                if (data && data.usd && typeof data.usd.bdt === 'number') {
                    bdtRatePerUsd = data.usd.bdt;
                    valueEl.textContent = '১ USD = ' + (Math.round(bdtRatePerUsd * 100) / 100) + ' BDT (তারিখ: ' + (data.date || '—') + ')';
                    valueEl.classList.remove('hidden');
                    updateBdtEquivalent();
                } else {
                    errorEl.textContent = 'রেট লোড হয়নি (ডেটা ফরম্যাট ভিন্ন)।';
                    errorEl.classList.remove('hidden');
                }
            })
            .catch(function (err) {
                if (loadingEl) loadingEl.classList.add('hidden');
                errorEl.textContent = 'রেট লোড করতে পারেনি: ' + (err.message || 'নেটওয়ার্ক এরর') + '।';
                errorEl.classList.remove('hidden');
            });
    }

    /**
     * বর্তমান অ্যামাউন্ট ও কারেন্সি অনুযায়ী BDT সমমান আপডেট (বাংলাদেশ API রেট দিয়ে)।
     * শুধু যখন bdtRatePerUsd সেট আছে এবং কারেন্সি USD তখন অ্যামাউন্ট × রেট = BDT দেখায়।
     */
    function updateBdtEquivalent() {
        var hintEl = document.getElementById('bdt-rate-hint');
        if (!hintEl) return;
        var data = getAmountAndCurrency();
        if (bdtRatePerUsd != null && data.currency === 'USD' && data.amount > 0) {
            var bdtEquivalent = (data.amount * bdtRatePerUsd);
            hintEl.textContent = 'সমমান (লাইভ রেট): ' + (Math.round(bdtEquivalent * 100) / 100) + ' BDT';
        } else {
            hintEl.textContent = 'অ্যামাউন্ট ও কারেন্সি নিচে সিলেক্ট করুন; BDT সমমান এখানে দেখাবে।';
        }
    }

    /**
     * কারেন্সি ড্রপডাউন ভরাট করা।
     * CURRENCIES অ্যারে থেকে option তৈরি করে select এ যোগ করে।
     * default: true যে কারেন্সি তারটা সিলেক্টেড রাখে।
     */
    function fillCurrencySelect() {
        if (!elCurrency) return;
        elCurrency.innerHTML = '';
        var defaultCurrency = null;
        CURRENCIES.forEach(function (c) {
            var opt = document.createElement('option');
            opt.value = c.code;
            opt.textContent = c.label || c.code;
            if (c.default) defaultCurrency = c.code;
            elCurrency.appendChild(opt);
        });
        if (defaultCurrency) elCurrency.value = defaultCurrency;
    }

    /**
     * পেমেন্ট মেথড বাটন রেন্ডার করা (কার্ড, পেপ্যাল, মোবাইল ব্যাংকিং, ব্যাংক)।
     * PAYMENT_METHODS থেকে প্রতিটার জন্য একটা বাটন বানায়; ক্লিক করলে সেই মেথড সিলেক্ট হয়।
     * প্রতিটি মেথডের config এ provider থাকে (stripe, paypal, custom) — সাবমিটের সময় এই provider অনুযায়ী আলাদা API কল করবেন।
     */
    function renderPaymentMethods() {
        if (!elMethodsContainer) return;
        elMethodsContainer.innerHTML = '';
        PAYMENT_METHODS.forEach(function (method) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'payment-method-btn';
            btn.setAttribute('data-payment-method', method.id);
            btn.setAttribute('aria-pressed', 'false');
            btn.innerHTML = '<i class="' + (method.icon || 'fa-solid fa-wallet') + '"></i><span>' + (method.label || method.id) + '</span>';
            // ক্লিক করলে এই মেথড সিলেক্ট হয় এবং method details সেকশন আপডেট হয় (কার্ড ফিল্ড / পেপ্যাল বাটন ইত্যাদি)
            btn.addEventListener('click', function () { setSelectedMethod(method); });
            elMethodsContainer.appendChild(btn);
        });
    }

    /**
     * কোন মেথড সিলেক্ট হয়েছে সেটা সেট করা এবং UI আপডেট।
     * - selectedMethodId ও selectedMethodObj আপডেট হয়
     * - মেথড বাটনগুলোর active ক্লাস টগল হয়
     * - method details সেকশনে সেই মেথড অনুযায়ী কনটেন্ট দেখায় (কার্ড/পেপ্যাল/মোবাইল/ব্যাংক)
     * -----------------------------------------------
     * API INTEGRATION POINT — মেথড অনুযায়ী এখানে বা showMethodDetails() এ:
     *   - card + provider 'stripe' → Stripe Elements লোড করে কার্ড ফিল্ড ইনজেক্ট করুন (Stripe.js + createPaymentIntent API call)
     *   - paypal → PayPal SDK লোড করে "Pay with PayPal" বাটন রেন্ডার করুন (PayPal Client ID from config)
     *   - mobile_banking / bank_transfer → আপনার ব্যাকএন্ড বা থার্ড পার্টি API (bKash, Nagad, Razorpay ইত্যাদি) থেকে ফর্ম/ইনস্ট্রাকশন দেখান
     */
    function setSelectedMethod(method) {
        selectedMethodId = method ? method.id : null;
        selectedMethodObj = method || null;
        // সব মেথড বাটনের active ক্লাস সরিয়ে দেয়, যেটা ক্লিক হয়েছে শুধু সেটায় active দেয়
        var btns = elMethodsContainer ? elMethodsContainer.querySelectorAll('.payment-method-btn') : [];
        btns.forEach(function (b) {
            var isActive = b.getAttribute('data-payment-method') === selectedMethodId;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        showMethodDetails();
        updateSummaryAndButton();
    }

    /**
     * সিলেক্টেড মেথড অনুযায়ী "বিস্তারিত" সেকশনের কনটেন্ট দেখানো।
     * - card: placeholder টেক্সট (আসলে Stripe Elements বা আপনার কার্ড ফর্ম এখানে ইনজেক্ট করবেন)
     * - paypal: placeholder (PayPal SDK দিয়ে বাটন এখানে রেন্ডার করবেন)
     * - mobile_banking / bank_transfer: placeholder (ব্যাংক/মোবাইল API থেকে ইনস্ট্রাকশন বা ফর্ম)
     * -----------------------------------------------
     * API INTEGRATION POINT — প্রতিটি case এ আপনার API যোগ করুন:
     *   1) Stripe Card: CONFIG.stripePublishableKey দিয়ে Stripe.js লোড করুন; createPaymentIntent এর জন্য আপনার ব্যাকএন্ড (apiEndpoints.createPaymentIntent) কল করে clientSecret নিন; Stripe Elements mount করুন এই elMethodDetailsContent এ।
     *   2) PayPal: CONFIG.paypalClientId দিয়ে PayPal SDK লোড করুন; createOrder এর জন্য ব্যাকএন্ড (apiEndpoints.createOrder) কল করুন; approve/capture এর জন্য apiEndpoints.captureOrder।
     *   3) Mobile/Bank: আপনার দেশভিত্তিক প্রোভাইডার (bKash, Nagad, Razorpay, Paystack) এর স크립্ট ও ফ্লো অনুযায়ী ফর্ম বা রেডিরেক্ট URL এখানে সেট করুন।
     */
    function showMethodDetails() {
        if (!elMethodDetailsSection || !elMethodDetailsContent) return;
        if (!selectedMethodId) {
            elMethodDetailsSection.classList.add('hidden');
            return;
        }
        elMethodDetailsSection.classList.remove('hidden');
        var html = '';
        var provider = selectedMethodObj && selectedMethodObj.provider ? selectedMethodObj.provider : 'custom';
        if (selectedMethodId === 'card' && provider === 'stripe') {
            // Stripe কার্ড: এখানে Stripe Elements এর container দিতে পারেন; এখন placeholder
            html = '<p class="text-sm text-slate-600">কার্ড নম্বর, এক্সপাইরি ও CVC — Stripe Elements এখানে যোগ করুন। <strong>API:</strong> payment-config.js এ <code>stripePublishableKey</code> দিন; ব্যাকএন্ডে <code>apiEndpoints.createPaymentIntent</code> দিয়ে Intent তৈরি করে clientSecret ফেরত দিন; এই জায়গায় Stripe mount করুন।</p>';
        } else if (selectedMethodId === 'paypal' && provider === 'paypal') {
            // PayPal: এখানে PayPal বাটন রেন্ডার করুন (SDK + createOrder/captureOrder API)
            html = '<p class="text-sm text-slate-600">Pay with PayPal বাটন — payment-config.js এ <code>paypalClientId</code> দিন; ব্যাকএন্ডে <code>createOrder</code> ও <code>captureOrder</code> এন্ডপয়েন্ট কল করুন। এই div এর id (e.g. paypal-button-container) PayPal SDK কে দিয়ে বাটন রেন্ডার করুন।</p><div id="paypal-button-container"></div>';
        } else if (selectedMethodId === 'mobile_banking') {
            html = '<p class="text-sm text-slate-600">মোবাইল ব্যাংকিং (bKash, Nagad, Rocket ইত্যাদি) — আপনার প্রোভাইডার স크립্ট লোড করে এখানে ফর্ম বা রেডিরেক্ট URL সেট করুন। API কল করুন আপনার ব্যাকএন্ড বা প্রোভাইডার ডকুমেন্টেশন অনুযায়ী।</p>';
        } else if (selectedMethodId === 'bank_transfer') {
            html = '<p class="text-sm text-slate-600">ব্যাংক ট্রান্সফার — একাউন্ট নম্বর ও রেফারেন্স দেখান; অথবা Stripe ACH / স্থানীয় ব্যাংক API দিয়ে ফ্লো চালান। API: ব্যাকএンド থেকে পেমেন্ট লিংক বা ইনস্ট্রাকশন জেনারেট করে এখানে দেখান।</p>';
        } else {
            html = '<p class="text-sm text-slate-600">বিস্তারিত কনফিগার করুন (provider: ' + provider + ')।</p>';
        }
        elMethodDetailsContent.innerHTML = html;
    }

    /**
     * পেমেন্ট মোড (প্রোডাক্ট/ডোনেশন/সাবস্ক্রিপশন) বদলানো।
     * বাটন ক্লিক করলে currentMode আপডেট হয় এবং অ্যাক্টিভ ক্লাস সিঙ্ক হয়।
     * সাবমিটের সময় এই mode ব্যাকএন্ডে পাঠাবেন যাতে সার্ভার জানে ট্রানজেকশন টাইপ কী।
     */
    function setupModeButtons() {
        var modeBtns = document.querySelectorAll('[data-payment-mode]');
        modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                currentMode = btn.getAttribute('data-payment-mode') || 'product';
                modeBtns.forEach(function (b) {
                    var isActive = b.getAttribute('data-payment-mode') === currentMode;
                    b.classList.remove('payment-mode-btn--active');
                    b.classList.toggle('active', isActive);
                    b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                });
                updateSummaryAndButton();
            });
        });
    }

    /**
     * অ্যামাউন্ট ও কারেন্সি থেকে সঠিক ভ্যালু নিয়ে রিটার্ন।
     * - amount: নম্বর (ইনপুট ভ্যালু পার্স করা); ভ্যালিড না হলে 0
     * - currency: সিলেক্ট থেকে তিন অক্ষরের কোড (USD, BDT, ...)
     */
    function getAmountAndCurrency() {
        var amount = 0;
        if (elAmount && elAmount.value !== '') {
            var parsed = parseFloat(elAmount.value, 10);
            if (!isNaN(parsed) && parsed >= 0) amount = parsed;
        }
        var currency = (elCurrency && elCurrency.value) || 'USD';
        return { amount: amount, currency: currency };
    }

    /**
     * সারাংশ টেক্সট আপডেট (মোট X USD) এবং Pay বাটন এনাবল/ডিজেবল।
     * - অ্যামাউন্ট >= MIN_AMOUNT এবং একটা মেথড সিলেক্ট থাকলে বাটন চালু
     */
    function updateSummaryAndButton() {
        var data = getAmountAndCurrency();
        var text = data.amount > 0 ? data.amount + ' ' + data.currency : '—';
        if (elSummaryText) elSummaryText.textContent = text;
        var valid = data.amount >= MIN_AMOUNT && selectedMethodId;
        if (elSubmitBtn) {
            elSubmitBtn.disabled = !valid;
            elSubmitBtn.setAttribute('aria-disabled', !valid);
        }
        updateBdtEquivalent();
    }

    /**
     * মেসেজ বক্স দেখানো (সাক্সেস বা এরর)।
     * - type: 'success' | 'error'
     * - message: দেখানোর টেক্সট
     */
    function showMessage(type, message) {
        if (!elMessage) return;
        elMessage.className = 'payment-message ' + (type === 'error' ? 'alert-error' : 'alert-success');
        elMessage.textContent = message;
        elMessage.classList.remove('hidden');
    }

    function hideMessage() {
        if (elMessage) elMessage.classList.add('hidden');
    }

    /**
     * Pay বাটন ক্লিক করলে চলে।
     * 1) অ্যামাউন্ট ও কারেন্সি চেক
     * 2) কোন মেথড সিলেক্ট আছে সেটা দেখে সেই অনুযায়ী API কল
     * -----------------------------------------------
     * API INTEGRATION POINT — এখানে প্রতিটি পেমেন্ট মেথডের জন্য আলাদা API কল করুন:
     *   - card (provider stripe): আপনার ব্যাকএন্ড createPaymentIntent কল করুন (amount, currency, mode); clientSecret পেয়ে Stripe.confirmCardPayment(clientSecret, { payment_method: { card: cardElement } }) করুন। সাক্সেস/ফেইল রিডাইরেক্ট বা মেসেজ দেখান।
     *   - paypal: ইতিমধ্যে PayPal বাটন দিয়ে createOrder/capture করলে আলাদা কল দরকার নাও হতে পারে; নাহলে এখানে ব্যাকএন্ড createOrder কল করে অর্ডার আইডি নিয়ে PayPal approve flow চালান।
     *   - mobile_banking: আপনার প্রোভাইডার API (bKash/Nagad/Razorpay ইত্যাদি) initiate করুন — সাধারণত ব্যাকএন্ড থেকে ট্রানজেকশন স্টার্ট করে রেডিরেক্ট বা SDK দিয়ে পেমেন্ট নেওয়া হয়।
     *   - bank_transfer: ব্যাকএন্ডে ব্যাংক ডিটেইল ও রেফারেন্স জেনারেট করে ইউজারকে দেখান, অথবা Stripe ACH ইত্যাদি API ব্যবহার করুন।
     * সব API কী ও সিক্রেট ব্যাকএন্ডে রাখুন; ফ্রন্ট থেকে শুধু অ্যামাউন্ট, কারেন্সি, mode, selectedMethodId পাঠাবেন।
     */
    function handleSubmit() {
        hideMessage();
        var data = getAmountAndCurrency();
        if (data.amount < MIN_AMOUNT) {
            showMessage('error', 'কমপক্ষে ' + MIN_AMOUNT + ' পরিমাণ লিখুন।');
            return;
        }
        if (!selectedMethodId || !selectedMethodObj) {
            showMessage('error', 'একটি পেমেন্ট মেথড বেছে নিন।');
            return;
        }
        var provider = selectedMethodObj.provider || 'custom';
        // -----------------------------------------------
        // এখানে provider অনুযায়ী আলাদা API কল করুন। নিচে শুধু placeholder।
        // Stripe: fetch(CONFIG.apiEndpoints.createPaymentIntent, { method:'POST', body: JSON.stringify({ amount, currency, mode: currentMode }) }).then(r=>r.json()).then(d=> { Stripe.confirmCardPayment(d.clientSecret, ...) })
        // PayPal: already handled by SDK button if you render it in showMethodDetails; else call createOrder here and open PayPal popup
        // Mobile/Bank: call your backend to get payment link or instructions, then redirect or show form
        // -----------------------------------------------
        showMessage('error', 'পেমেন্ট API এখনও সংযুক্ত নেই। payment.js এর handleSubmit() এ Stripe/PayPal/অন্যান্য API কল যোগ করুন; API কী ও এন্ডপয়েন্ট payment-config.js এ দিন।');
    }

    /**
     * ইভেন্ট লিসেনার বাঁধা: অ্যামাউন্ট/কারেন্সি বদল হলে সারাংশ ও বাটন আপডেট; সাবমিট বাটন ক্লিক হলে handleSubmit।
     */
    function bindEvents() {
        if (elAmount) elAmount.addEventListener('input', updateSummaryAndButton);
        if (elAmount) elAmount.addEventListener('change', updateSummaryAndButton);
        if (elCurrency) elCurrency.addEventListener('change', updateSummaryAndButton);
        if (elSubmitBtn) elSubmitBtn.addEventListener('click', handleSubmit);
    }

    /**
     * পেজ লোড হলে একবার চলে: DOM ক্যাশ, কারেন্সি ভরাট, মেথড বাটন, মোড বাটন, ইভেন্ট বাঁধা, সারাংশ আপডেট।
     */
    function init() {
        cacheDOMElements();
        fillCurrencySelect();
        renderPaymentMethods();
        setupModeButtons();
        bindEvents();
        updateSummaryAndButton();
        fetchBdtRate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
