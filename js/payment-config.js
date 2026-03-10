/**
 * payment-config.js
 * -----------------------------------------------
 * এই ফাইলে শুধু কনফিগ থাকে। অন্য সাইটে কপি করলে এই ফাইলেই
 * API কী, কারেন্সি লিস্ট, পেমেন্ট মেথড চালু/বন্ধ ইত্যাদি বদলাবেন।
 * payment.js এই কনফিগ পড়ে UI ও লজিক চালায়।
 * -----------------------------------------------
 */

(function () {
    'use strict';

    /**
     * Global config object. Change these when you copy this to another site.
     * window.PAYMENT_CONFIG is used by payment.js.
     */
    window.PAYMENT_CONFIG = {
        /**
         * -----------------------------------------------
         * API KEYS — এখানে প্রতিটি পেমেন্ট প্রোভাইডারের কী দিন
         * -----------------------------------------------
         * সাবধান: পাবলিক কী (client-side) শুধু এখানে ব্যবহার করুন।
         * সিক্রেট কী কখনো ফ্রন্টএন্ডে রাখবেন না; ব্যাকএন্ড থেকে
         * Payment Intent / Order তৈরি করে সেই সার্ভারেই API কল করুন।
         */

        /** Stripe (কার্ড, অনেক দেশ, অনেক কারেন্সি)
         *  ড্যাশবোয়ার্ড: https://dashboard.stripe.com/apikeys
         *  এখানে শুধু Publishable key (pk_live_... বা pk_test_...) দিন। */
        stripePublishableKey: '',

        /** PayPal (বিশ্বব্যাপী, একাউন্ট দিয়ে পে)
         *  ড্যাশবোয়ার্ড: https://developer.paypal.com/dashboard/
         *  এখানে Client ID দিন (সিক্রেট ব্যাকএন্ডে)। */
        paypalClientId: '',

        /**
         * অন্যান্য প্রোভাইডার (Razorpay, bKash, Paystack ইত্যাদি)
         * সাধারণত ব্যাকএন্ড থেকে initiate হয়; ফ্রন্টে শুধু key/merchant ID
         * বা রেডিরেক্ট URL লাগতে পারে। নিচের মতো প্রপার্টি যোগ করুন।
         */
        // razorpayKeyId: '',
        // bkashScriptUrl: '',
        // paystackPublicKey: '',

        /**
         * -----------------------------------------------
         * CURRENCIES — কোন কোন কারেন্সি সিলেক্টারে দেখাবে
         * -----------------------------------------------
         * code: ISO 4217 (USD, BDT, INR, EUR ...)
         * label: ড্রপডাউনে যা দেখাবে
         * default: true হলে প্রথম লোডে এই কারেন্সি সিলেক্ট থাকবে
         */
        currencies: [
            { code: 'USD', label: 'USD — US Dollar', default: true },
            { code: 'BDT', label: 'BDT — Bangladeshi Taka', default: false },
            { code: 'INR', label: 'INR — Indian Rupee', default: false },
            { code: 'EUR', label: 'EUR — Euro', default: false },
            { code: 'GBP', label: 'GBP — British Pound', default: false },
            { code: 'PKR', label: 'PKR — Pakistani Rupee', default: false }
        ],

        /**
         * -----------------------------------------------
         * PAYMENT METHODS — কোন মেথড চালু থাকবে এবং কী দিয়ে
         * -----------------------------------------------
         * id: ইউনিক (card, paypal, mobile_banking, bank_transfer)
         * label: ইউজারকে যা দেখাবে
         * icon: FontAwesome class (fa-brands fa-cc-visa, fa-paypal, etc.)
         * enabled: true করলে সিলেক্টরে দেখা যাবে
         * provider: কোন API ব্যবহার করবেন (stripe, paypal, razorpay, bkash, ...)
         *   — payment.js এ switch(this.provider) দিয়ে কোথায় API কল করতে হবে সেটা কমেন্টে লেখা আছে
         */
        paymentMethods: [
            { id: 'card', label: 'কার্ড (ক্রেডিট/ডেবিট)', icon: 'fa-solid fa-credit-card', enabled: true, provider: 'stripe' },
            { id: 'paypal', label: 'PayPal', icon: 'fa-brands fa-paypal', enabled: true, provider: 'paypal' },
            { id: 'mobile_banking', label: 'মোবাইল ব্যাংকিং', icon: 'fa-solid fa-mobile-screen', enabled: true, provider: 'custom' },
            { id: 'bank_transfer', label: 'ব্যাংক ট্রান্সফার', icon: 'fa-solid fa-building-columns', enabled: true, provider: 'custom' }
        ],

        /**
         * -----------------------------------------------
         * BACKEND / API — আপনার সার্ভার এন্ডপয়েন্ট
         * -----------------------------------------------
         * createPaymentIntent: Stripe ব্যবহার করলে আপনার ব্যাকএন্ড এন্ডপয়েন্ট
         *   যে অ্যামাউন্ট + কারেন্সি নিয়ে Stripe Payment Intent তৈরি করে এবং clientSecret রিটার্ন করে।
         * createOrder: PayPal ব্যবহার করলে ব্যাকএন্ড যে অর্ডার তৈরি করে তার ID বা জিনিস রিটার্ন করে।
         * এই URL গুলো অন্য সাইটে কপি করার সময় বদলাবেন।
         */
        apiEndpoints: {
            createPaymentIntent: '', // e.g. 'https://yoursite.com/api/create-payment-intent'
            createOrder: '',         // e.g. 'https://yoursite.com/api/create-paypal-order'
            captureOrder: ''         // e.g. 'https://yoursite.com/api/capture-paypal-order'
        },

        /**
         * Minimum amount (in smallest unit or as number). Below this Pay button stays disabled.
         */
        minAmount: 1,

        /**
         * Default payment mode when page loads: 'product' | 'donation' | 'subscription'
         */
        defaultMode: 'product'
    };
})();
