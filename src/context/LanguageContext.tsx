import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';

export type SupportedLanguage = 'en' | 'ta';

export interface MotivationalQuote {
  quote: string;
  author: string;
}

export const ENGLISH_QUOTES: MotivationalQuote[] = [
  { quote: "A small saving today is the cornerstone of great security tomorrow.", author: "Chanakya (Arthashastra)" },
  { quote: "Discipline in financial record-keeping builds the foundation of trust and prosperity.", author: "Warren Buffett" },
  { quote: "Trust is earned when actions meet commitments every single month.", author: "Financial Wisdom" },
  { quote: "Mutual credit and community trust turn collective savings into empowered growth.", author: "Indian Chit Fund Heritage" },
  { quote: "He who looks after the small pennies will never have to worry about the millions.", author: "Proverb" },
  { quote: "Consistency in collection is the lifeblood of a healthy chit fund company.", author: "Operations Rule" },
  { quote: "Integrity in accounts is the highest virtue of an entrepreneur.", author: "M. K. Gandhi" },
  { quote: "A rupee saved and pooled systematically compounds into life-changing opportunities.", author: "Financial Principle" },
  { quote: "Punctuality in payments creates an unshakeable reputation in business.", author: "Commerce Adage" },
  { quote: "Clarity in financial ledgers dispels all ambiguity and preserves long-term harmony.", author: "Accounting Canon" },
  { quote: "The secret to financial success is simple: track every single transaction with diligence.", author: "B. Franklin" },
  { quote: "Community-driven finance is the oldest and most resilient form of cooperative prosperity.", author: "Economic Thought" },
  { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { quote: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
  { quote: "Financial freedom is available to those who learn about it and work for it.", author: "Robert Kiyosaki" },
  { quote: "The habit of saving is itself an education; it fosters every virtue.", author: "T.T. Munger" },
  { quote: "It is not the man who has too little, but the man who craves more, that is poor.", author: "Seneca" },
  { quote: "Money is a terrible master but an excellent servant.", author: "P.T. Barnum" },
  { quote: "Wealth is not about having a lot of money; it is about having a lot of options.", author: "Chris Rock" },
  { quote: "Never spend your money before you have earned it.", author: "Thomas Jefferson" },
  { quote: "A budget is telling your money where to go instead of wondering where it went.", author: "Dave Ramsey" },
  { quote: "In investing, what is comfortable is rarely profitable.", author: "Robert Arnott" },
  { quote: "The most powerful force in the universe is compound interest.", author: "Albert Einstein" },
  { quote: "Every rupee you save today is a rupee working for your future.", author: "Indian Saving Proverb" },
  { quote: "Chit funds are the people's bank — built on trust, powered by community.", author: "Cooperative Finance Heritage" },
  { quote: "Good financial habits, practiced consistently, create extraordinary outcomes over time.", author: "Suze Orman" },
  { quote: "Manage your money, or the lack of it will manage you.", author: "Dave Ramsey" },
  { quote: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin" },
  { quote: "The key to financial wellness is to pay yourself first.", author: "George Clason" },
  { quote: "Think not of immediate profits; plant seeds that will bear fruit in due season.", author: "Indian Business Wisdom" },
  { quote: "There are no shortcuts to any place worth going financially.", author: "Beverly Sills" },
  { quote: "Money grows on the tree of persistence.", author: "Japanese Proverb" },
  { quote: "Prosperity is not about how much you earn, but how wisely you save.", author: "Cooperative Finance Saying" },
  { quote: "Shared savings, shared prosperity — the essence of a chit fund.", author: "Chit Fund Heritage" },
  { quote: "A good record is gold in a business built on trust.", author: "Accounting Wisdom" },
  { quote: "Financial security is not a destination. It is a daily discipline.", author: "Personal Finance Wisdom" },
  { quote: "Build your empire one installment at a time.", author: "Chit Fund Proverb" },
  { quote: "The price of anything is the amount of life you exchange for it.", author: "Henry David Thoreau" },
  { quote: "Saving money is the first step toward financial independence.", author: "Financial Wisdom" },
  { quote: "An organized account book is the backbone of every successful business.", author: "Commerce Adage" },
  { quote: "Without sacrifice, there is no growth. Without patience, there is no compound interest.", author: "Investment Truth" },
  { quote: "Numbers do not lie. Accurate books tell the story of a healthy enterprise.", author: "Accounting Canon" },
  { quote: "Great financial minds focus not on making money, but on keeping it.", author: "Wall Street Wisdom" },
  { quote: "The collective strength of a chit group is mightier than any individual savings.", author: "Cooperative Finance" },
  { quote: "Pay your installments before you pay for luxuries. Discipline creates wealth.", author: "Financial Wisdom" },
  { quote: "Savings is the seed. Time is the soil. Patience is the water. Wealth is the harvest.", author: "Financial Metaphor" },
  { quote: "If you buy things you do not need, soon you will have to sell things you need.", author: "Warren Buffett" },
  { quote: "The secret of getting ahead is getting started. Start saving today.", author: "Mark Twain (adapted)" },
  { quote: "Every great fortune was once a modest, disciplined saving habit.", author: "Economic Principle" },
  { quote: "Accountability in money matters is the truest sign of professional character.", author: "Commerce Wisdom" },
  { quote: "Pay on time. Record with precision. Grow with confidence.", author: "Chitflow Principle" },
  { quote: "Service to your members today is the seed of loyalty and trust tomorrow.", author: "Cooperative Wisdom" },
  { quote: "A chit fund runs on faith. Repay that faith every month without fail.", author: "Chit Fund Heritage" },
  { quote: "Order in accounts brings order to life and peace of mind to business.", author: "Financial Wisdom" },
  { quote: "Excellence in finance is not perfection — it is relentless consistency.", author: "Business Principle" },
  { quote: "When you save as a group, you dream as a group and achieve as a group.", author: "Cooperative Finance" },
  { quote: "Discipline today; dividend tomorrow.", author: "Investment Wisdom" },
  { quote: "One clear ledger is worth a thousand verbal assurances.", author: "Accounts Proverb" },
  { quote: "True wealth is measured not by what you own, but by what you consistently save.", author: "Financial Principle" },
  { quote: "A penny saved is a penny earned, but a rupee invested in a chit is a future secured.", author: "Chit Fund Wisdom" },
  { quote: "Reliability in commitments is the currency of trust.", author: "Business Proverb" },
  { quote: "Behind every prosperous family is a disciplined saving habit.", author: "Indian Heritage" },
  { quote: "The wise man saves in times of plenty to prepare for times of need.", author: "Chanakya" },
  { quote: "Community savings circles have survived millennia because they work — for everyone.", author: "Economic History" },
];

export const TAMIL_QUOTES: MotivationalQuote[] = [
  { quote: "சிறுகச் சேமித்து முறைப்படி முதலீடு செய்வதே பெருஞ்செல்வத்தின் தொடக்கம்.", author: "சாணக்கியர் (அர்த்தசாஸ்திரம்)" },
  { quote: "துல்லியமான கணக்குப் பதிவேடு தேவையற்ற குழப்பங்களைத் தவிர்த்து வாடிக்கையாளர் நம்பிக்கையை வளர்க்கும்.", author: "வாரன் பஃபெட்" },
  { quote: "வாக்குறுதிகளை மாதாந்தோறும் தவறாமல் நிறைவேற்றுவதே நம்பிக்கையின் அடித்தளம்.", author: "நிதி ஞானம்" },
  { quote: "பரஸ்பர நம்பிக்கையும் கூட்டுச் சேமிப்பும் சமுதாயத்தை வலிமைப்படுத்தும் மூலதனம்.", author: "சீட்டு நிதி பாரம்பரியம்" },
  { quote: "சிறு துளி பெரு வெள்ளம்; முறையான சிறு சேமிப்பே எதிர்காலத்தைப் பாதுகாக்கும் கவசம்.", author: "தமிழ் பழமொழி" },
  { quote: "ஒழுங்கான மாதாந்திர வசூலே கூட்டு நிதியின் நிலைத்தன்மைக்கு உயிர்நாடி.", author: "நிதி மேலாண்மை விதி" },
  { quote: "கணக்கில் நேர்மையும் ஒழுக்கமும் கொண்ட வணிகமே தலைமுறை கடந்து நிலைத்து நிற்கும்.", author: "அண்ணல் காந்தியடிகள்" },
  { quote: "கூட்டாகச் சேர்க்கும் சிறு சேமிப்பும் பெரும் வாழ்க்கை வாய்ப்புகளை உருவாக்கித் தரும்.", author: "பொருளாதாரத் தத்துவம்" },
  { quote: "தவணைத் தொகையை உரிய நாளில் செலுத்துவது சமூகத்தில் நன்மதிப்பை உருவாக்கும்.", author: "வணிக நெறி" },
  { quote: "தெளிவான கணக்கு வழக்குகளே நீண்டகால நல்லுறவுக்கும் வளர்ச்சிக்கும் அடிப்படை.", author: "கணக்கியல் மரபு" },
  { quote: "நாள்தோறும் வரவு செலவுகளைத் துல்லியமாகக் கண்காணிப்பதே நிதி வெற்றியின் ரகசியம்.", author: "பெஞ்சமின் பிராங்க்ளின்" },
  { quote: "சமுதாயம் சார்ந்த கூட்டு நிதி முறையே மக்கள் பொருளாதாரத்தின் மிகச் சிறந்த வடிவம்.", author: "பொருளாதார சிந்தனை" },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    all_chits: "All Chits",
    ledger: "Master Ledger",
    collections: "Collections",
    cashbook: "Cashbook",
    reminders: "Reminders",
    settings: "Settings",
    new_chit: "New Chit",
    create_chit: "Create Chit Scheme",
    record_payment: "Record Payment",
    welcome_back: "Welcome back",
    admin_suite: "Admin Suite",
    local_database: "Local Database",
    cloud_active: "Supabase Cloud Active",
    total_collections: "Total Collections",
    cash_in_hand: "Cash in Hand",
    upi_bank_balance: "UPI / Bank Balance",
    active_chits: "Active Chit Schemes",
    outstanding_dues: "Outstanding Dues",
    daily_quote_title: "Daily Financial & Motivational Inspiration",
    share_quote_wa: "Share Quote to WhatsApp",
    quote_shared: "Quote opened in WhatsApp!",
    paid: "Paid",
    unpaid: "Unpaid",
    partially_paid: "Partially Paid",
    eligible: "Eligible",
    verified: "Verified",
    reversed: "Reversed",
    active: "Active",
    completed: "Completed",
    draft: "Draft",
    mark_paid: "Mark Paid",
    top_up: "+ Top Up",
    pay: "Pay",
    pay_due: "Pay Due",
    receipt: "Receipt",
    undo: "Undo",
    redo: "Redo",
    edit: "Edit",
    unmark: "Unmark",
    undo_payment: "Undo Payment",
    edit_payment: "Edit Payment",
    undo_shuffle: "Undo Winner Mark",
    resend_wa: "Resend WA",
    share_wa: "Share WA",
    enroll_member: "Enroll Member",
    remove: "Remove",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save Changes",
    update_redo: "Update & Redo Payment",
    confirm_receipt: "Confirm & Issue Receipt",
    chit_shuffle: "Chit Shuffle",
    shuffled: "Shuffled",
    winner: "Winner",
    monthly_winner_register: "Monthly Chit Shuffling Winners Register",
    mark_shuffle_winner: "Mark Chit Shuffling Winner",
    mark_as_shuffled: "Mark as Shuffled",
    update_mark_only: "Update Mark Only",
    undo_remove_mark: "Undo / Remove Winner Mark",
    share_on_whatsapp: "Share on WhatsApp",
    whatsapp_winner_msg: "Based on our chit shuffling process you have been selected as this month winner, for further details and query contact the Admin",
    col_receipt: "Receipt #",
    col_date: "Date",
    col_subscriber: "Subscriber Contact",
    col_seat: "Seat #",
    col_installment: "Installment",
    col_base_due: "Base Due",
    col_carried_balance: "Carried Balance / Credit",
    col_adjusted_due: "Total Adjusted Due",
    col_amount_paid: "Amount Actually Paid",
    col_remaining_balance: "Remaining Net Balance",
    col_payment_mode: "Payment Mode",
    col_bank_account: "Bank Account",
    col_status: "Status",
    col_actions: "Actions",
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    select_bank: "Select Bank Account *",
    reversal_title: "Undo / Reverse Mistaken Transaction",
    reversal_desc: "Immediately nullifies this record and recalculates all running balances",
    audit_reason: "Reason for Correction / Undo *",
    confirm_undo: "Confirm Undo & Recalculate",
    edit_redo_instead: "Edit & Redo Instead",
    language_label: "Language",
    english: "English",
    tamil: "தமிழ்",
  },
  ta: {
    dashboard: "முகப்பு பலகை",
    all_chits: "அனைத்து சீட்டுகள்",
    ledger: "முதன்மைப் பேரேடு",
    collections: "வசூல் பதிவேடு",
    cashbook: "ரொக்கப் புத்தகம்",
    reminders: "நினைவூட்டல்கள்",
    settings: "அமைப்புகள்",
    new_chit: "புதிய சீட்டு",
    create_chit: "புதிய சீட்டுத் திட்டம்",
    record_payment: "கட்டணம் பதிவு செய்க",
    welcome_back: "வணக்கம்",
    admin_suite: "நிர்வாகத் தொகுப்பு",
    local_database: "உள்ளகத் தரவுத்தளம்",
    cloud_active: "கிளவுட் தரவுத்தளம் இணைப்பில் உள்ளது",
    total_collections: "மொத்த வசூல் தொகை",
    cash_in_hand: "கையில் உள்ள ரொக்கம்",
    upi_bank_balance: "UPI / வங்கிக் கணக்கு இருப்பு",
    active_chits: "செயலில் உள்ள சீட்டுகள்",
    outstanding_dues: "நிலுவையில் உள்ள தவணைகள்",
    daily_quote_title: "இன்றைய சேமிப்பு மற்றும் நிதிப் பொன்மொழி",
    share_quote_wa: "வாட்ஸ்அப்-ல் பகிர்க",
    quote_shared: "பொன்மொழி வாட்ஸ்அப்-ல் பகிரப்பட்டது!",
    paid: "முழுமையாகச் செலுத்தப்பட்டது",
    unpaid: "செலுத்தப்படவில்லை",
    partially_paid: "பகுதித் தொகை செலுத்தப்பட்டது",
    eligible: "தகுதியுடையவர்",
    verified: "சரிபார்க்கப்பட்டது",
    reversed: "செயல்தவிர்க்கப்பட்டது",
    active: "செயலில் உள்ளது",
    completed: "முடிவுற்றது",
    draft: "வரைவு",
    mark_paid: "கட்டணம் பதிவு செய்க",
    top_up: "+ மீதித் தொகை செலுத்துக",
    pay: "செலுத்துக",
    pay_due: "தவணை செலுத்துக",
    receipt: "ரசீது",
    undo: "செயல்தவிர்",
    redo: "மீண்டும் செய்",
    edit: "திருத்துக",
    unmark: "நீக்குக",
    undo_payment: "கட்டணம் செயல்தவிர்",
    edit_payment: "கட்டணம் திருத்துக",
    undo_shuffle: "குலுக்கல் செயல்தவிர்",
    resend_wa: "மீண்டும் வாட்ஸ்அப் செய்க",
    share_wa: "வாட்ஸ்அப்-ல் பகிர்க",
    enroll_member: "உறுப்பினரைச் சேர்க்க",
    remove: "நீக்குக",
    cancel: "ரத்து செய்",
    confirm: "உறுதிப்படுத்துக",
    save: "மாற்றங்களைச் சேமி",
    update_redo: "திருத்தி மீண்டும் பதிவு செய்",
    confirm_receipt: "உறுதி செய்து ரசீது வழங்குக",
    chit_shuffle: "சீட்டுக் குலுக்கல்",
    shuffled: "குலுக்கல் முடிந்தது",
    winner: "வெற்றியாளர்",
    monthly_winner_register: "மாதாந்திர சீட்டுக் குலுக்கல் வெற்றியாளர்கள் பதிவு",
    mark_shuffle_winner: "சீட்டுக் குலுக்கல் வெற்றியாளர் பதிவு",
    mark_as_shuffled: "குலுக்கல் முடித்தவராகப் பதிவு செய்",
    update_mark_only: "பதிவை மட்டும் புதுப்பிக்க",
    undo_remove_mark: "வெற்றியாளர் பதிவைச் செயல்தவிர்",
    share_on_whatsapp: "வாட்ஸ்அப் மூலம் பகிர்க",
    whatsapp_winner_msg: "வணக்கம்! நமது சீட்டுக் குலுக்கல் முறையில் இந்த மாத வெற்றியாளராக நீங்கள் தேர்ந்தெடுக்கப்பட்டுள்ளீர்கள் என்பதை மகிழ்ச்சியுடன் தெரிவித்துக் கொள்கிறோம். கூடுதல் விவரங்களுக்கு நிர்வாகியைத் தொடர்பு கொள்ளவும். வாழ்த்துகள்!",
    col_receipt: "ரசீது எண்",
    col_date: "தேதி",
    col_subscriber: "சந்தாதாரர் பெயர் & எண்",
    col_seat: "இருக்கை எண்",
    col_installment: "மாதத் தவணை",
    col_base_due: "அடிப்படைத் தவணை",
    col_carried_balance: "முந்தைய நிலுவை / முன்பணம்",
    col_adjusted_due: "செலுத்த வேண்டிய மொத்தத் தவணை",
    col_amount_paid: "செலுத்தப்பட்ட தொகை",
    col_remaining_balance: "மீதமுள்ள நிலுவைத் தொகை",
    col_payment_mode: "செலுத்தும் முறை",
    col_bank_account: "வங்கிக் கணக்கு",
    col_status: "நிலை",
    col_actions: "செயல்கள்",
    cash: "ரொக்கம்",
    upi: "UPI",
    bank_transfer: "வங்கிப் பரிமாற்றம்",
    select_bank: "வங்கிக் கணக்கைத் தேர்ந்தெடுக்கவும் *",
    reversal_title: "தவறான பதிவைச் செயல்தவிர்த்தல் / ரத்து செய்தல்",
    reversal_desc: "இப்பதிவை உடனடியாக ரத்து செய்து அனைத்து மாதாந்திர நிலுவைக் கணக்குகளையும் துல்லியமாக மறு கணக்கீடு செய்யும்",
    audit_reason: "செயல்தவிர்ப்பதற்கான காரணம் *",
    confirm_undo: "செயல்தவிர் & மீண்டும் கணக்கிடு",
    edit_redo_instead: "இதனைத் திருத்தி மீண்டும் செய்க",
    language_label: "மொழி",
    english: "English",
    tamil: "தமிழ்",
  },
};

export const PHRASE_DICTIONARY: Record<string, string> = {
  // Navigation & Core App
  "Dashboard": "முகப்பு பலகை",
  "All Chits": "அனைத்து சீட்டுகள்",
  "Master Ledger": "முதன்மைப் பேரேடு",
  "Collections": "வசூல் பதிவேடு",
  "Cashbook": "ரொக்கப் புத்தகம்",
  "Reminders": "நினைவூட்டல்கள்",
  "Settings": "அமைப்புகள்",
  "CHITFLOW": "சீட்டு ஃப்ளோ",
  "Admin Suite": "நிர்வாகத் தொகுப்பு",
  "Local Database": "உள்ளகத் தரவுத்தளம்",
  "Supabase Cloud Active": "கிளவுட் தரவுத்தளம் இணைப்பில் உள்ளது",
  "Switch Active Operator": "நிர்வாகப் பயனரை மாற்று",
  "Simulate Owner vs Staff role permissions": "உரிமையாளர் மற்றும் ஊழியர் அனுமதிகளை மாற்றி அமை",
  "Create New Chit": "புதிய சீட்டு உருவாக்குக",
  "Create New Scheme": "புதிய திட்டம் உருவாக்குக",
  "New Chit": "புதிய சீட்டு",
  "Connect DB": "தரவுத்தள இணைப்பு",
  "Language": "மொழி",
  "English": "English",
  "Tamil": "தமிழ்",

  // Roles
  "owner": "உரிமையாளர் / நிர்வாகி",
  "collector": "வசூலிப்பாளர்",
  "auditor": "தணிக்கையாளர்",
  "staff": "ஊழியர்",
  "Owner": "உரிமையாளர் / நிர்வாகி",
  "Collector": "வசூலிப்பாளர்",
  "Auditor": "தணிக்கையாளர்",
  "Staff": "ஊழியர்",

  // Dashboard Stats & Cards
  "Welcome back": "வணக்கம்",
  "Company Administration": "நிறுவன நிர்வாகம்",
  "Total Collections": "மொத்த வசூல் தொகை",
  "Cash in Hand": "கையில் உள்ள ரொக்கம்",
  "Cash In Hand": "கையில் உள்ள ரொக்கம்",
  "UPI / Bank Balance": "UPI / வங்கிக் கணக்கு இருப்பு",
  "Active Chit Schemes": "செயலில் உள்ள சீட்டுகள்",
  "Active Chits": "செயலில் உள்ள சீட்டுகள்",
  "Outstanding Dues": "நிலுவையில் உள்ள தவணைகள்",
  "All Schemes Combined": "அனைத்து திட்டங்களின் மொத்தம்",
  "Quick Actions": "விரைவுச் செயல்கள்",
  "Active Schemes": "செயலில் உள்ள திட்டங்கள்",
  "Active Schemes Overview": "செயலில் உள்ள திட்டங்கள்",
  "Recent Financial Collections": "சமீபத்திய வசூல்கள்",
  "Recent Financial Transactions": "சமீபத்திய நிதிப் பரிவர்த்தனைகள்",
  "View All": "அனைத்தையும் காண்க",
  "View All Collections": "அனைத்து வசூல்களையும் காண்க",
  "Total Members": "மொத்த உறுப்பினர்கள்",
  "Active Subscribers": "செயலில் உள்ள சந்தாதாரர்கள்",
  "Gross Collected": "மொத்த வசூலான தொகை",
  "Daily Financial & Motivational Inspiration": "இன்றைய சேமிப்பு மற்றும் நிதிப் பொன்மொழி",
  "Share Quote to WhatsApp": "வாட்ஸ்அப்-ல் பகிர்க",
  "Quote opened in WhatsApp!": "பொன்மொழி வாட்ஸ்அப்-ல் பகிரப்பட்டது!",
  "Dashboard Filters:": "முகப்பு வடிகட்டிகள்:",
  "All Chit Schemes": "அனைத்து சீட்டுத் திட்டங்கள்",
  "All Time": "அனைத்துக் காலமும்",
  "This Month": "இந்த மாதம்",
  "Today": "இன்று",
  "Contact Ledger": "சந்தாதாரர் பேரேடு",
  "Unified multi-chit payments": "ஒருங்கிணைந்த பல-சீட்டு கட்டணங்கள்",
  "Direct bank settlements": "நேரடி வங்கி வரவுகள்",
  "All schemes on schedule": "அனைத்து திட்டங்களும் சரியான அட்டவணையில் உள்ளன",
  "No Chit Schemes Created Yet": "சீட்டுத் திட்டங்கள் எதுவும் உருவாக்கப்படவில்லை",
  "Create Your First Chit Scheme": "உங்கள் முதல் சீட்டுத் திட்டத்தை உருவாக்கவும்",
  "Create Your First Scheme": "முதல் திட்டத்தை உருவாக்கவும்",
  "No payments recorded yet. Financial transactions appear here only when explicitly collected.": "இதுவரை எந்தக் கட்டணமும் பதிவு செய்யப்படவில்லை. வசூலிக்கப்படும் போது நிதிப் பரிவர்த்தனைகள் இங்கு தோன்றும்.",
  "Click any scheme to open its dedicated workspace": "திட்டத்தின் பிரத்யேகப் பக்கத்தைத் திறக்க அதன் மீது சொடுக்கவும்",
  "Real-time ledger audit trail with Cash/UPI verification": "ரொக்கம் மற்றும் UPI சரிபார்ப்புடன் நேரலை பேரேட்டு தணிக்கை பதிவு",
  "All Chit Schemes & Groups": "அனைத்து சீட்டுத் திட்டங்கள் & குழுக்கள்",
  "No Chit Schemes Found": "சீட்டுத் திட்டங்கள் எதுவும் இல்லை",

  // Common Table Headers
  "Receipt #": "ரசீது எண்",
  "Receipt No": "ரசீது எண்",
  "Date": "தேதி",
  "Subscriber": "சந்தாதாரர்",
  "Subscriber Contact": "சந்தாதாரர் பெயர் & எண்",
  "Subscriber Name": "சந்தாதாரர் பெயர்",
  "Scheme": "சீட்டுத் திட்டம்",
  "Scheme Name": "திட்டத்தின் பெயர்",
  "Scheme Code": "திட்டக் குறியீடு",
  "Monthly Due": "மாதத் தவணை",
  "Installment": "மாதத் தவணை",
  "Inst #": "தவணை #",
  "Installment #": "தவணை எண்",
  "Month": "மாதம்",
  "Duration": "கால அளவு",
  "Total Value": "மொத்த மதிப்பு",
  "Total Pool": "மொத்த நிதித் தொகை",
  "Total Pot Pool": "மொத்த நிதித் தொகை",
  "Total Pot": "மொத்த நிதி",
  "Seats Filled": "நிரப்பப்பட்ட இருக்கைகள்",
  "Seats": "இருக்கைகள்",
  "Capacity": "கொள்ளளவு",
  "Seat #": "இருக்கை எண்",
  "Status": "நிலை",
  "Actions": "செயல்கள்",
  "Action": "செயல்",
  "Method": "செலுத்தும் முறை",
  "Transaction Mode": "செலுத்தும் முறை",
  "Payment Mode": "செலுத்தும் முறை",
  "Amount": "தொகை",
  "Amount Paid": "செலுத்தப்பட்ட தொகை",
  "Amount Actually Paid": "செலுத்தப்பட்ட தொகை",
  "Balance": "மீதி நிலுவை",
  "Remaining Balance": "மீதமுள்ள நிலுவைத் தொகை",
  "Net Balance": "நிகர நிலுவை",
  "Due Date": "செலுத்த வேண்டிய தேதி",
  "Due Day": "தவணைத் தேதி",
  "Chit Shuffling Date": "சீட்டுக் குலுக்கல் தேதி",
  "Shuffling Date": "குலுக்கல் தேதி",
  "Reference / Notes": "குறிப்பு / பரிவர்த்தனை எண்",
  "Reference ID": "பரிவர்த்தனை எண்",
  "Notes": "குறிப்புகள்",
  "Running Total": "மொத்தக் கூட்டுத் தொகை",
  "Round": "சுற்று / மாதம்",
  "Winner Contact": "வெற்றியாளர் பெயர்",
  "Mobile Number": "அலைபேசி எண்",
  "WhatsApp Notification": "வாட்ஸ்அப் அறிவிப்பு",
  "Winner Notified": "வெற்றியாளருக்கு அறிவிக்கப்பட்டது",
  "Monthly / Seat": "மாதத் தவணை",

  // Statuses
  "Paid": "முழுமையாகச் செலுத்தப்பட்டது",
  "Unpaid": "செலுத்தப்படவில்லை",
  "Partially Paid": "பகுதித் தொகை செலுத்தப்பட்டது",
  "Partial": "பகுதித் தொகை",
  "Pending": "நிலுவையில் உள்ளது",
  "Active": "செயலில் உள்ளது",
  "Active Only": "செயலில் உள்ளவை",
  "Completed": "முடிவுற்றது",
  "Completed / Matured": "முடிவுற்றவை",
  "Draft": "வரைவு",
  "Drafts": "வரைவுகள்",
  "Reversed": "செயல்தவிர்க்கப்பட்டது",
  "Eligible": "தகுதியுடையவர்",
  "Verified": "சரிபார்க்கப்பட்டது",
  "Overdue": "தவணை தவறியது",
  "Opened": "திறக்கப்பட்டது",
  "Delivered": "சென்றடைந்தது",
  "Accepted": "ஏற்றுக்கொள்ளப்பட்டது",
  "Failed": "தோல்வி",
  "Not Sent": "அனுப்பப்படவில்லை",

  // Buttons & Actions
  "Record Payment": "கட்டணம் பதிவு செய்க",
  "Mark Paid": "கட்டணம் செலுத்து",
  "Pay": "செலுத்துக",
  "+ Pay": "+ தவணை",
  "+ Top Up": "+ மீதி செலுத்துக",
  "Top Up": "மீதி செலுத்துக",
  "Receipt": "ரசீது",
  "View Receipt": "ரசீது காண்க",
  "Print Receipt": "ரசீதை அச்சிடுக",
  "Print / View Receipt": "ரசீதை அச்சிடுக / காண்க",
  "Share Receipt": "ரசீதை வாட்ஸ்அப்பில் பகிர்க",
  "Share Receipt to WhatsApp": "ரசீதை வாட்ஸ்அப்பில் பகிர்க",
  "Share WhatsApp": "வாட்ஸ்அப்பில் பகிர்க",
  "Share WA": "வாட்ஸ்அப் பகிர்வு",
  "Resend WA": "மீண்டும் வாட்ஸ்அப்",
  "Undo": "செயல்தவிர்",
  "Redo": "மீண்டும் செய்",
  "Edit": "திருத்துக",
  "Edit Payment": "கட்டணம் திருத்துக",
  "Undo Payment": "கட்டணம் செயல்தவிர்",
  "Undo Seat": "இருக்கை ஒதுக்கீட்டை ரத்து செய்",
  "Save": "சேமிக்க",
  "Save Changes": "மாற்றங்களைச் சேமி",
  "Cancel": "ரத்து செய்",
  "Confirm": "உறுதிப்படுத்துக",
  "Close": "மூடுக",
  "Search": "தேடுக",
  "Filter": "வடிகட்டுக",
  "Export": "ஏற்றுமதி செய்க",
  "Export Excel": "Excel பதிவிறக்கு",
  "Export CSV": "CSV பதிவிறக்கு",
  "Download": "பதிவிறக்குக",
  "Print": "அச்சிடுக",
  "Print Register": "பதிவேட்டை அச்சிடுக",
  "Delete": "நீக்குக",
  "Remove": "நீக்குக",
  "Add Member": "உறுப்பினரைச் சேர்க்க",
  "Enroll Member": "உறுப்பினரைச் சேர்க்க",
  "Assign Seat": "இருக்கை ஒதுக்கீடு",
  "Open WhatsApp": "வாட்ஸ்அப் திறக்க",
  "Send Reminder": "நினைவூட்டல் அனுப்புக",
  "Select All": "அனைத்தையும் தேர்ந்தெடு",
  "Deselect All": "அனைத்தையும் நீக்கு",
  "Send to Selected": "தேர்ந்தெடுத்தவருக்கு அனுப்புக",
  "Send to Everyone": "அனைவருக்கும் அனுப்புக",
  "Back to all chits": "அனைத்து சீட்டுகளுக்கும் பின்செல்",
  "Overview": "கண்ணோட்டம்",
  "Members": "உறுப்பினர்கள்",
  "Schedule & Maturity": "அட்டவணை & முதிர்வு",

  // Chit Shuffling & Winners
  "Chit Shuffle": "சீட்டுக் குலுக்கல்",
  "Chit Shuffled": "குலுக்கல் முடிந்தது",
  "Shuffled": "குலுக்கல் முடிந்தது",
  "Winner": "வெற்றியாளர்",
  "Mark as Winner": "வெற்றியாளராகப் பதிவு செய்",
  "Mark Chit Shuffling Winner": "சீட்டுக் குலுக்கல் வெற்றியாளர் பதிவு",
  "Mark as Chit Shuffled": "குலுக்கல் முடித்தவராகப் பதிவு செய்",
  "Monthly Chit Shuffling Winners Register": "மாதாந்திர சீட்டுக் குலுக்கல் வெற்றியாளர்கள் பதிவேடு",
  "Undo Winner Mark": "வெற்றியாளர் பதிவைச் செயல்தவிர்",
  "Undo / Remove Winner Mark": "வெற்றியாளர் பதிவைச் செயல்தவிர்",
  "Direct WhatsApp Share": "நேரடி வாட்ஸ்அப் பகிர்வு",
  "Direct WhatsApp Link": "வாட்ஸ்அப் இணைப்பு",
  "Mark as Chit Shuffled & Notify WhatsApp": "குலுக்கல் வெற்றியாளராகப் பதிவு செய்து வாட்ஸ்அப்பில் அறிவிக்க",
  "Update Mark Only": "பதிவை மட்டும் புதுப்பிக்க",

  // Payment Recording Modal
  "Mark Monthly Chit Payment": "சீட்டு மாதாந்திர தவணை பதிவு செய்தல்",
  "Edit & Redo Payment": "கட்டணத்தை திருத்தி மீண்டும் பதிவு செய்தல்",
  "Chit Scheme *": "சீட்டுத் திட்டம் *",
  "Subscriber Member *": "சந்தாதாரர் உறுப்பினர் *",
  "No members enrolled in this chit": "இந்த சீட்டில் உறுப்பினர்கள் யாரும் சேர்க்கப்படவில்லை",
  "Current Month Due Breakdown": "இந்த மாதத் தவணை விவரம்",
  "Current Month Due": "இந்த மாதத் தவணை",
  "Base Due Amount": "அடிப்படைத் தவணைத் தொகை",
  "Previous Carried Balance": "முந்தைய நிலுவை / முன்பணம்",
  "Total Adjusted Due to Collect": "வசூலிக்க வேண்டிய மொத்தத் தொகை",
  "Actual Amount Received *": "பெறப்பட்ட தொகை *",
  "Quick Fill Amount": "விரைவுத் தொகை உள்ளீடு",
  "Payment Method *": "செலுத்தும் முறை *",
  "Bank Account *": "வங்கிக் கணக்கு *",
  "Select Bank Account *": "வங்கிக் கணக்கைத் தேர்ந்தெடுக்கவும் *",
  "Installment Number": "தவணை மாதம்",
  "Transaction Date *": "பரிவர்த்தனை தேதி *",
  "Reference ID / Transaction Ref": "பரிவர்த்தனை எண் / குறிப்பு",
  "Collector Notes / Remarks": "வசூலிப்பாளர் குறிப்புரை",
  "Confirm & Issue Receipt": "உறுதி செய்து ரசீது வழங்குக",
  "Update & Redo Payment": "திருத்தி மீண்டும் பதிவு செய்க",
  "Undo This Payment": "இந்தக் கட்டணத்தை செயல்தவிர்",
  "Cash": "ரொக்கம்",
  "UPI": "UPI",
  "Bank Transfer": "வங்கிப் பரிமாற்றம்",
  "Please select a chit scheme.": "தயவுசெய்து ஒரு சீட்டுத் திட்டத்தைத் தேர்ந்தெடுக்கவும்.",
  "Please select an enrolled subscriber member.": "தயவுசெய்து பதிவு செய்த உறுப்பினரைத் தேர்ந்தெடுக்கவும்.",
  "Please enter a valid payment amount greater than zero.": "பூஜ்ஜியத்தை விட அதிகமான சரியான தொகையை உள்ளிடவும்.",
  "Bank Account selection is mandatory for UPI payments. Please choose an account.": "UPI கட்டணங்களுக்கு வங்கிக் கணக்கைத் தேர்ந்தெடுப்பது கட்டாயமாகும்.",

  // Reversal Modal
  "Authorize Financial Reversal": "பரிவர்த்தனையை செயல்தவிர்த்தல் / ரத்து செய்தல்",
  "Undo / Reverse Transaction": "பரிவர்த்தனையை செயல்தவிர் / மாற்று",
  "Undo / Reverse Mistaken Transaction": "தவறான பதிவைச் செயல்தவிர்த்தல் / ரத்து செய்தல்",
  "Amount to Nullify:": "ரத்து செய்யப்படும் தொகை:",
  "Amount to Reverse:": "ரத்து செய்யப்படும் தொகை:",
  "Mandatory Audit Reason *": "செயல்தவிர்ப்பதற்கான காரணம் *",
  "Reason for Correction / Undo *": "செயல்தவிர்ப்பதற்கான காரணம் *",
  "Reason / Mistake Note": "காரணம் (விரைவுத் தேர்வு)",
  "Confirm Reversal": "செயல்தவிர்ப்பை உறுதிப்படுத்துக",
  "Confirm Undo & Recalculate": "செயல்தவிர் & மீண்டும் கணக்கிடு",
  "Edit & Redo Instead": "இதனைத் திருத்தி மீண்டும் செய்க",
  "Edit Instead": "மாற்றி அமை (திருத்து)",
  "Wrong member selected": "தவறான சந்தாதாரருக்கு பதிவு செய்யப்பட்டது",
  "Wrong amount entered": "தவறான தொகை உள்ளிடப்பட்டது",
  "Duplicate entry": "இருமுறை பதிவு செய்யப்பட்டது",
  "Wrong bank account selected": "தவறான வங்கி தேர்வு",

  // Member Ledger Modal & Details
  "Monthly Due Schedule": "மாதாந்திர தவணை அட்டவணை",
  "Itemized Collection Receipts Register": "வசூல் ரசீதுகளின் முழுப் பதிவேடு",
  "Itemized Receipts Register": "வசூல் ரசீதுகளின் முழுப் பதிவேடு",
  "Subscriber Ledger": "சந்தாதாரர் பேரேடு",
  "Base Due": "அடிப்படைத் தவணை",
  "Carried Balance": "முந்தைய நிலுவை",
  "Total Adjusted Due": "மொத்தத் தவணை",
  "Payment Mode & Bank": "செலுத்தும் முறை & வங்கி",
  "Remaining Net Balance": "மீதமுள்ள நிலுவைத் தொகை",
  "Total Expected Contribution": "மொத்த சேமிப்புத் தொகை",
  "Total Net Paid to Date": "இதுவரை செலுத்திய மொத்தத் தொகை",
  "Current Outstanding Balance": "தற்போதைய நிலுவைத் தொகை",
  "Excess Credit Available": "முன்பணமாக உள்ள தொகை",
  "Total Chit Pool": "மொத்த சீட்டு நிதித் தொகை",
  "Actual Collections Received": "பெறப்பட்ட மொத்த வசூல்",
  "Outstanding Balance": "நிலுவையில் உள்ள தொகை",
  "Scheme Progress": "திட்ட முன்னேற்றம்",
  "Scheduled future collections": "எதிர்காலத்தில் வசூலிக்கப்பட வேண்டியவை",
  "Overall Collection Milestone": "ஒட்டுமொத்த வசூல் இலக்கு",
  "Scheme Rules & Agreement Terms": "திட்ட விதிகள் மற்றும் ஒப்பந்த நிபந்தனைகள்",
  "Foreman Notes & Operating Guidelines": "நிர்வாகக் குறிப்புகள் மற்றும் வழிகாட்டுதல்கள்",
  "Enrolled Subscribers & Payment Status": "பதிவு செய்த சந்தாதாரர்கள் மற்றும் தவணை நிலை",

  // Master Ledger & Collections Views
  "Master Financial Payment Register": "முதன்மை நிதி வசூல் பதிவேடு",
  "Contacts Ledger": "சந்தாதாரர் வாரியான பேரேடு",
  "Contact-Wise Ledger": "சந்தாதாரர் வாரியான பேரேடு",
  "All Transactions Register": "அனைத்து பரிவர்த்தனைகள் பதிவேடு",
  "Payment History": "கட்டண வரலாறு",
  "All Transactions": "அனைத்து பரிவர்த்தனைகள்",
  "Subscription Collections Register": "சந்தா வசூல் பதிவேடு",
  "Complete audit register of all member installment receipts and payment allocations": "அனைத்து உறுப்பினர் தவணை ரசீதுகள் மற்றும் கட்டண ஒதுக்கீடுகளின் முழுமையான தணிக்கைப் பதிவேடு",
  "Due Balance": "நிலுவைத் தவணை",
  "Remaining scheduled installments": "மீதமுள்ள திட்டமிட்ட தவணைகள்",
  "UPI / Bank Mode": "UPI / வங்கி முறை",
  "All Schemes": "அனைத்து திட்டங்கள்",
  "All Payment Methods": "அனைத்து செலுத்தும் முறைகள்",
  "All Methods (Cash & UPI)": "அனைத்து முறைகள் (ரொக்கம் & UPI)",
  "Cash Only": "ரொக்கம் மட்டும்",
  "UPI Only": "UPI மட்டும்",
  "All Members": "அனைத்து உறுப்பினர்கள்",
  "With Active Chits": "செயலில் உள்ள சீட்டுகள் மட்டும்",
  "With Due Balance": "நிலுவைத் தொகை உள்ளவர்கள்",
  "No contacts match the current search filter.": "தேடல் முடிவுகளுக்கு எந்த சந்தாதாரரும் பொருந்தவில்லை.",
  "No financial transactions recorded yet.": "இதுவரை எந்தப் பரிவர்த்தனைகளும் பதிவு செய்யப்படவில்லை.",

  // Cashbook & Reminders & Settings
  "Company Cashbook & Flow Register": "ரொக்கப் புத்தகம் மற்றும் பணப்புழக்கப் பதிவேடு",
  "Cash Flow & Running Ledger": "பணப்புழக்கம் மற்றும் நடப்புப் பேரேடு",
  "Real-time tracking of cash in hand and UPI bank balances across all chits": "அனைத்து சீட்டுகளின் கையில் உள்ள ரொக்கம் மற்றும் UPI வங்கி நிலுவைகளின் நேரலை கண்காணிப்பு",
  "Add Entry": "புதிய பதிவு சேர்க்க",
  "Add Cashbook Entry": "ரொக்கப் புத்தகப் பதிவு சேர்க்க",
  "Income": "வரவு",
  "Expense": "செலவு",
  "Payout": "பட்டுவாடா",
  "Net Liquid Balance": "நிகர திரவ இருப்பு",
  "Money In": "வரவுத் தொகை",
  "Money Out": "செலவுத் தொகை",
  "Party": "நபரின் பெயர்",
  "Entry Type": "பதிவு வகை",
  "Net Bal": "நிகர இருப்பு",
  "Cash Bal": "ரொக்க இருப்பு",
  "UPI Bal": "UPI இருப்பு",
  "WhatsApp Reminders Hub": "வாட்ஸ்அப் நினைவூட்டல் மையம்",
  "Dispatch individual customized WhatsApp due notifications and track delivery logs": "தனிப்பயனாக்கப்பட்ட வாட்ஸ்அப் தவணை நினைவூட்டல்களை அனுப்பி நிலவரத்தைக் கண்காணிக்கவும்",
  "Send Due Reminder": "தவணை நினைவூட்டல் அனுப்புக",
  "Templates": "செய்தி வார்ப்புருக்கள்",
  "Delivery History": "அனுப்பப்பட்ட வரலாறு",
  "Backend Settings": "வாட்ஸ்அப் அமைப்புகள்",
  "Select All Recipients": "அனைத்து பெறுநர்களையும் தேர்ந்தெடு",
  "Notifications": "அறிவிப்புகள்",
  "Mark all as read": "அனைத்தையும் படித்ததாகக் குறி",
  "No unread notifications": "புதிய அறிவிப்புகள் ஏதுமில்லை",
  "System Settings & Master Configuration": "கணினி அமைப்புகள் & முதன்மை உள்ளமைவு",
  "Company Profile": "நிறுவன விவரங்கள்",
  "Team & User Permissions": "குழு மற்றும் பயனர் அனுமதிகள்",
  "Audit Trail Log": "தணிக்கை பதிவு வரலாறு",
  "Database Backup & Export": "தரவுத்தள காப்பு & ஏற்றுமதி",
  "Export JSON Backup": "JSON காப்புப் பதிவிறக்கு",
  "Download JSON Backup": "JSON காப்புப் பதிவிறக்கு",
  "Clear All Data & Reset": "அனைத்து தரவுகளையும் நீக்குக",
  "Company Name *": "நிறுவனத்தின் பெயர் *",
  "Registration Number": "பதிவு எண்",
  "Official Phone Number *": "அலுவலகத் தொலைபேசி எண் *",
  "Official Email Address *": "அலுவலக மின்னஞ்சல் முகவரி *",
  "Physical Address": "நிறுவன முகவரி",
  "Receipt Number Prefix": "ரசீது எண் முன்னொட்டு",
  "Save Company Profile": "நிறுவன விவரங்களைச் சேமிக்க",
  "Company profile updated successfully!": "நிறுவன விவரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன!",
  "Add New Team Member": "புதிய உறுப்பினரைச் சேர்க்க",
  "Full Name": "முழுப் பெயர்",
  "Email Address": "மின்னஞ்சல் முகவரி",
  "Role": "பொறுப்பு",
  "Add User": "பயனரைச் சேர்க்க",

  // Wizard Steps
  "Step 1: Scheme Details": "படி 1: திட்ட விவரங்கள்",
  "Step 2: Add Members": "படி 2: உறுப்பினர்களைச் சேர்த்தல்",
  "Step 3: Review Members List": "படி 3: உறுப்பினர்கள் சரிபார்ப்பு",
  "Step 4: Confirm & Launch": "படி 4: உறுதி செய்து தொடங்குதல்",
  "Create New Chit Scheme": "புதிய சீட்டுத் திட்டம் உருவாக்குதல்",
  "Scheme Name *": "திட்டத்தின் பெயர் *",
  "Monthly Installment Amount *": "மாதாந்திர தவணைத் தொகை *",
  "Duration (Months) *": "கால அளவு (மாதங்கள்) *",
  "Total Seats (Subscribers) *": "மொத்த இருக்கைகள் (சந்தாதாரர்கள்) *",
  "Start Date *": "தொடங்கும் தேதி *",
  "Payment Due Day of Month *": "மாதாந்திர தவணை தேதி *",
  "Chit Shuffling Date (Day of Month)": "சீட்டுக் குலுக்கல் தேதி",
  "Next Step: Add Members": "அடுத்த படி: உறுப்பினர்களைச் சேர்க்க",
  "Back": "பின்செல்",
  "Next": "அடுத்து",
  "Launch Scheme": "திட்டத்தை உருவாக்குக",

  // Receipt Modal
  "Payment Receipt": "கட்டண ரசீது",
  "PAYMENT RECEIPT": "கட்டண ரசீது",
  "CHITFLOW MANAGEMENT SYSTEM": "சீட்டு ஃப்ளோ மேலாண்மை அமைப்பு",
  "OFFICIAL CHIT INSTALLMENT RECEIPT": "அதிகாரப்பூர்வ சீட்டுத் தவணை ரசீது",
  "Received From": "பெறப்பட்டவர்",
  "Amount in Words": "தொகை எழுத்தால்",
  "Authorized Signatory": "அங்கீகரிக்கப்பட்ட கையொப்பம்",
  "Member Signatory": "சந்தாதாரர் கையொப்பம்",
  "Official Receipt Copy": "அதிகாரப்பூர்வ ரசீது நகல்",
  "Receipt Generated At": "ரசீது உருவாக்கப்பட்ட நேரம்",

  // Placeholders
  "Search scheme, subscriber, phone, receipt #...": "தேடுக: திட்டம், சந்தாதாரர், போன் எண், ரசீது...",
  "Search by scheme name or code...": "திட்டத்தின் பெயர் அல்லது குறியீடு மூலம் தேடுக...",
  "Search contact by name or phone...": "பெயர் அல்லது தொலைபேசி எண் மூலம் தேடுக...",
  "Search contact name, phone, chit code, receipt no...": "பெயர், எண், திட்டக் குறியீடு, ரசீது எண் மூலம் தேடுக...",
  "Search by receipt #, subscriber name, UPI reference...": "ரசீது எண், சந்தாதாரர் பெயர், UPI எண் மூலம் தேடுக...",
  "Search by party name, receipt number, reference...": "பெயர், ரசீது எண், குறிப்பு மூலம் தேடுக...",
  "Search by subscriber name or phone...": "சந்தாதாரர் பெயர் அல்லது எண் மூலம் தேடுக...",
  "Search in ledger...": "பேரேட்டில் தேடுக...",
  "Enter search term...": "தேடல் சொல்லை உள்ளிடவும்...",
  "Optional transaction reference or note...": "பரிவர்த்தனை எண் அல்லது குறிப்பு...",
};

// DYNAMIC REGEX PATTERNS FOR SEAMLESS REAL-TIME TRANSLATION
export const DYNAMIC_PATTERNS: Array<{ regex: RegExp; replace: (...args: any[]) => string }> = [
  { regex: /^All\s*\(\s*(\d+)\s*\)$/i, replace: (_, n) => `அனைத்தும் (${n})` },
  { regex: /^Unpaid\s*\(\s*(\d+)\s*\)$/i, replace: (_, n) => `செலுத்தப்படாதவை (${n})` },
  { regex: /^Partial\s*\(\s*(\d+)\s*\)$/i, replace: (_, n) => `பகுதித் தொகை (${n})` },
  { regex: /^Paid\s*\(\s*(\d+)\s*\)$/i, replace: (_, n) => `செலுத்தப்பட்டவை (${n})` },
  { regex: /^Paid\s*\(\s*(₹[\d,]+)\s*\)$/i, replace: (_, amt) => `செலுத்தப்பட்டது (${amt})` },
  { regex: /^Select All\s*\(\s*(\d+)\s*\)$/i, replace: (_, n) => `அனைத்தையும் தேர்ந்தெடு (${n})` },
  { regex: /^Send to Selected\s*\(\s*(\d+)\s*\)$/i, replace: (_, n) => `தேர்ந்தெடுத்தவருக்கு அனுப்புக (${n})` },
  { regex: /^Send to Everyone\s*\(\s*(\d+)\s*\)$/i, replace: (_, n) => `அனைவருக்கும் அனுப்புக (${n})` },
  { regex: /^(\d+)\s+of\s+(\d+)\s+selected$/i, replace: (_, a, b) => `${a} / ${b} தேர்ந்தெடுக்கப்பட்டது` },
  { regex: /^(\d+)\s+of\s+(\d+)\s+seats filled$/i, replace: (_, a, b) => `${a} / ${b} இருக்கைகள் நிரம்பின` },
  { regex: /^(\d+)\s+of\s+(\d+)\s+monthly shuffling rounds completed$/i, replace: (_, a, b) => `${a} / ${b} மாதாந்திர குலுக்கல்கள் முடிந்தது` },
  { regex: /^Month\s*#?(\d+)\s+Winner$/i, replace: (_, n) => `மாதம் #${n} வெற்றியாளர்` },
  { regex: /^Month\s*#?(\d+)$/i, replace: (_, n) => `மாதம் #${n}` },
  { regex: /^Month\s*(\d+)\s*\/\s*(\d+)$/i, replace: (_, a, b) => `மாதம் ${a} / ${b}` },
  { regex: /^(\d+)\s+months to planned maturity$/i, replace: (_, n) => `முதிர்வடைய இன்னும் ${n} மாதங்கள்` },
  { regex: /^(\d+)\s+seats\s*×\s*(₹[\d,]+)\/mo$/i, replace: (_, seats, amt) => `${seats} இருக்கைகள் × ${amt}/மாதம்` },
  { regex: /^Cash:\s*(₹[\d,]+)\s*•\s*UPI:\s*(₹[\d,]+)$/i, replace: (_, c, u) => `ரொக்கம்: ${c} • UPI: ${u}` },
  { regex: /^Cash:\s*(₹[\d,]+)$/i, replace: (_, c) => `ரொக்கம்: ${c}` },
  { regex: /^UPI:\s*(₹[\d,]+)$/i, replace: (_, u) => `UPI: ${u}` },
  { regex: /^Showing\s+(\d+)\s+receipts$/i, replace: (_, n) => `${n} ரசீதுகள் காட்டப்படுகின்றன` },
  { regex: /^Active Total:\s*(₹[\d,]+)$/i, replace: (_, a) => `நடப்பு வசூல்: ${a}` },
  { regex: /^Filtered Total:\s*(₹[\d,]+)$/i, replace: (_, a) => `வடிகட்டப்பட்ட மொத்தம்: ${a}` },
  { regex: /^Members\s*\(\s*(\d+\/\d+)\s*\)$/i, replace: (_, s) => `உறுப்பினர்கள் (${s})` },
  { regex: /^Collections\s*\(\s*(\d+)\s*\)$/i, replace: (_, s) => `வசூல் (${s})` },
  { regex: /^Enrolled Subscribers & Payment Status\s*\((.*)\)$/i, replace: (_, s) => `சந்தாதாரர்கள் & தவணை நிலை (${s})` },
  { regex: /^Collections Register for\s+(.*)$/i, replace: (_, s) => `${s} வசூல் பதிவேடு` },
  { regex: /^Due on\s+(\d+)(?:st|nd|rd|th)$/i, replace: (_, d) => `மாதம் ${d}-ஆம் தேதி` },
  { regex: /^Due\s+(\d+)(?:st|nd|rd|th)\s+of month$/i, replace: (_, d) => `மாதம் ${d}-ஆம் தேதி` },
  { regex: /^Due on\s+(.*)$/i, replace: (_, d) => `தவணைத் தேதி: ${d}` },
  { regex: /^Shuffling:\s*(.*)$/i, replace: (_, d) => `குலுக்கல் தேதி: ${d}` },
  { regex: /^Started\s*(.*?)\s*•\s*Maturity\s*(.*?)\s*•\s*(\d+)\s*Months\s*•\s*Due on\s*(.*)$/i, replace: (_, s, m, mo, d) => `தொடங்கியது ${s} • முதிர்வு ${m} • ${mo} மாதங்கள் • தவணை ${d}` },
  { regex: /^(\d+)\s+Months$/i, replace: (_, n) => `${n} மாதங்கள்` },
  { regex: /^(\d+)\s+schemes nearing maturity$/i, replace: (_, n) => `${n} திட்டங்கள் விரைவில் முதிர்வடைகின்றன` },
  { regex: /^(\d+)\s+contacts in chits$/i, replace: (_, n) => `${n} உறுப்பினர்கள் சீட்டுகளில் உள்ளனர்` },
  { regex: /^\/\s*(\d+)\s+total$/i, replace: (_, n) => `/ ${n} மொத்தம்` },
  { regex: /^Seat\s*#(\d+)$/i, replace: (_, n) => `இருக்கை #${n}` },
  { regex: /^#(\d+)$/i, replace: (_, n) => `#${n}` },
];

export const translateStatus = (status: string, language: SupportedLanguage): string => {
  if (language !== 'ta') return status;
  const s = status.toLowerCase();
  if (s === 'paid') return 'முழுமையாகச் செலுத்தப்பட்டது';
  if (s === 'unpaid') return 'செலுத்தப்படவில்லை';
  if (s === 'partial' || s === 'partially_paid') return 'பகுதித் தொகை';
  if (s === 'pending') return 'நிலுவை';
  if (s === 'active') return 'செயலில் உள்ளது';
  if (s === 'completed' || s === 'matured') return 'முடிவுற்றது';
  if (s === 'draft') return 'வரைவு';
  if (s === 'reversed') return 'செயல்தவிர்க்கப்பட்டது';
  if (s === 'eligible') return 'தகுதியுடையவர்';
  if (s === 'winner' || s === 'shuffled') return 'குலுக்கல் வெற்றியாளர்';
  return PHRASE_DICTIONARY[status] || status;
};

export const translateRole = (role: string, language: SupportedLanguage): string => {
  if (language !== 'ta') return role;
  const r = role.toLowerCase();
  if (r === 'owner') return 'உரிமையாளர் / நிர்வாகி';
  if (r === 'collector') return 'வசூலிப்பாளர்';
  if (r === 'auditor') return 'தணிக்கையாளர்';
  if (r === 'staff') return 'ஊழியர்';
  return PHRASE_DICTIONARY[role] || role;
};

export const translatePaymentMethod = (method: string, language: SupportedLanguage): string => {
  if (language !== 'ta') return method;
  const m = method.toLowerCase();
  if (m === 'cash') return 'ரொக்கம்';
  if (m === 'upi') return 'UPI';
  if (m === 'bank_transfer') return 'வங்கிப் பரிமாற்றம்';
  return PHRASE_DICTIONARY[method] || method;
};

export const translateMonthName = (month: string | number, language: SupportedLanguage): string => {
  if (language !== 'ta') return String(month);
  const tamilMonths: Record<string, string> = {
    '1': 'மாதம் 1', '2': 'மாதம் 2', '3': 'மாதம் 3', '4': 'மாதம் 4', '5': 'மாதம் 5',
    '6': 'மாதம் 6', '7': 'மாதம் 7', '8': 'மாதம் 8', '9': 'மாதம் 9', '10': 'மாதம் 10',
    '11': 'மாதம் 11', '12': 'மாதம் 12',
    'jan': 'ஜனவரி', 'january': 'ஜனவரி',
    'feb': 'பிப்ரவரி', 'february': 'பிப்ரவரி',
    'mar': 'மார்ச்', 'march': 'மார்ச்',
    'apr': 'ஏப்ரல்', 'april': 'ஏப்ரல்',
    'may': 'மே',
    'jun': 'ஜூன்', 'june': 'ஜூன்',
    'jul': 'ஜூலை', 'july': 'ஜூலை',
    'aug': 'ஆகஸ்ட்', 'august': 'ஆகஸ்ட்',
    'sep': 'செப்டம்பர்', 'september': 'செப்டம்பர்',
    'oct': 'அக்டோபர்', 'october': 'அக்டோபர்',
    'nov': 'நவம்பர்', 'november': 'நவம்பர்',
    'dec': 'டிசம்பர்', 'december': 'டிசம்பர்',
  };
  const key = String(month).toLowerCase().trim();
  return tamilMonths[key] || String(month);
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (keyOrText: string, defaultText?: string) => string;
  getQuote: (date?: Date) => MotivationalQuote;
  getWinnerWhatsAppMessage: () => string;
  translateStatus: (status: string) => string;
  translateRole: (role: string) => string;
  translatePaymentMethod: (method: string) => string;
  translateMonthName: (month: string | number) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (keyOrText, defaultText) => defaultText || keyOrText,
  getQuote: () => ENGLISH_QUOTES[0],
  getWinnerWhatsAppMessage: () => TRANSLATIONS.en.whatsapp_winner_msg,
  translateStatus: (s) => s,
  translateRole: (r) => r,
  translatePaymentMethod: (m) => m,
  translateMonthName: (m) => String(m),
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('chitflow_app_language');
      return (saved === 'ta' || saved === 'en') ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('chitflow_app_language', lang);
      document.documentElement.lang = lang;
    } catch {}
  };

  const t = useMemo(() => {
    return (keyOrText: string, defaultText?: string): string => {
      if (language === 'en') {
        return TRANSLATIONS.en[keyOrText] || defaultText || keyOrText;
      }
      
      // 1. Exact key match in TRANSLATIONS.ta
      if (TRANSLATIONS.ta[keyOrText]) {
        return TRANSLATIONS.ta[keyOrText];
      }

      // 2. Exact match in PHRASE_DICTIONARY
      if (PHRASE_DICTIONARY[keyOrText]) {
        return PHRASE_DICTIONARY[keyOrText];
      }

      // 3. Fallback match in PHRASE_DICTIONARY or TRANSLATIONS.ta
      if (defaultText) {
        if (TRANSLATIONS.ta[defaultText]) return TRANSLATIONS.ta[defaultText];
        if (PHRASE_DICTIONARY[defaultText]) return PHRASE_DICTIONARY[defaultText];
      }

      // 4. Trimmed match
      const trimmed = keyOrText.trim();
      if (PHRASE_DICTIONARY[trimmed]) {
        return PHRASE_DICTIONARY[trimmed];
      }

      // 5. Dynamic pattern test
      for (const { regex, replace } of DYNAMIC_PATTERNS) {
        if (regex.test(trimmed)) {
          return trimmed.replace(regex, replace);
        }
      }

      return defaultText || TRANSLATIONS.en[keyOrText] || keyOrText;
    };
  }, [language]);

  const getQuote = useMemo(() => {
    return (date = new Date()): MotivationalQuote => {
      const startOfYear = new Date(date.getFullYear(), 0, 0);
      const diff = date.getTime() - startOfYear.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);

      const quotesList = language === 'ta' ? TAMIL_QUOTES : ENGLISH_QUOTES;
      const index = Math.abs(dayOfYear) % quotesList.length;
      return quotesList[index];
    };
  }, [language]);

  const getWinnerWhatsAppMessage = useMemo(() => {
    return (): string => {
      return TRANSLATIONS[language]?.whatsapp_winner_msg || TRANSLATIONS.en.whatsapp_winner_msg;
    };
  }, [language]);

  // Universal Bi-directional DOM Scanner & Dynamic Transformer
  useEffect(() => {
    document.documentElement.lang = language;
    if (typeof window === 'undefined') return;

    let isTranslating = false;

    const translateDomNodes = () => {
      if (isTranslating) return;
      const root = document.getElementById('root');
      if (!root) return;

      isTranslating = true;
      try {
        if (language === 'en') {
          // In English mode, React JSX is already English.
          // Restore any cached text if previously translated
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          let currentNode = walker.nextNode();
          while (currentNode) {
            if ((currentNode as any).__origText !== undefined) {
              if (currentNode.nodeValue !== (currentNode as any).__origText) {
                currentNode.nodeValue = (currentNode as any).__origText;
              }
              delete (currentNode as any).__origText;
            }
            currentNode = walker.nextNode();
          }

          // Restore placeholders
          const inputs = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[placeholder], textarea[placeholder]');
          inputs.forEach((input) => {
            if ((input as any).__origPlaceholder !== undefined) {
              input.setAttribute('placeholder', (input as any).__origPlaceholder);
            }
          });

          // Restore titles
          const titled = root.querySelectorAll<HTMLElement>('[title]');
          titled.forEach((el) => {
            if ((el as any).__origTitle !== undefined) {
              el.setAttribute('title', (el as any).__origTitle);
            }
          });
          return;
        }

        // Language is Tamil ('ta')
        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              const tag = parent.tagName.toLowerCase();
              if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'code') {
                return NodeFilter.FILTER_REJECT;
              }
              if (parent.getAttribute('data-no-translate') === 'true') {
                return NodeFilter.FILTER_REJECT;
              }
              return NodeFilter.FILTER_ACCEPT;
            },
          }
        );

        let currentNode = walker.nextNode();
        while (currentNode) {
          if ((currentNode as any).__origText === undefined) {
            (currentNode as any).__origText = currentNode.nodeValue || '';
          }

          const raw = (currentNode as any).__origText;
          const text = raw.trim();

          if (text) {
            let target = '';
            if (PHRASE_DICTIONARY[text]) {
              target = raw.replace(text, PHRASE_DICTIONARY[text]);
            } else {
              for (const { regex, replace } of DYNAMIC_PATTERNS) {
                if (regex.test(text)) {
                  target = raw.replace(text, text.replace(regex, replace));
                  break;
                }
              }
            }
            if (target && currentNode.nodeValue !== target) {
              currentNode.nodeValue = target;
            }
          }

          currentNode = walker.nextNode();
        }

        // Synchronize input and textarea placeholders
        const inputs = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[placeholder], textarea[placeholder]');
        inputs.forEach((input) => {
          if ((input as any).__origPlaceholder === undefined) {
            (input as any).__origPlaceholder = input.getAttribute('placeholder') || '';
          }
          const ph = ((input as any).__origPlaceholder || '').trim();
          if (ph) {
            let targetPh = '';
            if (PHRASE_DICTIONARY[ph]) {
              targetPh = PHRASE_DICTIONARY[ph];
            } else {
              for (const { regex, replace } of DYNAMIC_PATTERNS) {
                if (regex.test(ph)) {
                  targetPh = ph.replace(regex, replace);
                  break;
                }
              }
            }
            if (targetPh && input.getAttribute('placeholder') !== targetPh) {
              input.setAttribute('placeholder', targetPh);
            }
          }
        });

        // Synchronize title attributes (tooltips)
        const titled = root.querySelectorAll<HTMLElement>('[title]');
        titled.forEach((el) => {
          if ((el as any).__origTitle === undefined) {
            (el as any).__origTitle = el.getAttribute('title') || '';
          }
          const title = ((el as any).__origTitle || '').trim();
          if (title && PHRASE_DICTIONARY[title] && el.getAttribute('title') !== PHRASE_DICTIONARY[title]) {
            el.setAttribute('title', PHRASE_DICTIONARY[title]);
          }
        });
      } finally {
        isTranslating = false;
      }
    };

    // Run translation pass
    translateDomNodes();

    // Only observe structural changes (childList), never observe characterData to prevent recursion
    const observer = new MutationObserver(() => {
      translateDomNodes();
    });

    const rootEl = document.getElementById('root');
    if (rootEl) {
      observer.observe(rootEl, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
    };
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        getQuote,
        getWinnerWhatsAppMessage,
        translateStatus: (s) => translateStatus(s, language),
        translateRole: (r) => translateRole(r, language),
        translatePaymentMethod: (m) => translatePaymentMethod(m, language),
        translateMonthName: (m) => translateMonthName(m, language),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => useContext(LanguageContext);
