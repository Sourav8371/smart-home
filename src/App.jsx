import React, { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { getDatabase, ref, onValue, set, get, child, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

function isEmail(v) { return /\S+@\S+\.\S+/.test(v); }
function slugify(v) { return v.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""); }

// Translate raw Firebase error codes into friendly messages
function friendlyError(err) {
    const code = err?.code || "";
    const map = {
        "auth/user-not-found": "No account found with that email. Please register first.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-credential": "Incorrect email or password. Double-check and try again.",
        "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
        "auth/weak-password": "Password is too weak. Use at least 6 characters.",
        "auth/invalid-email": "That doesn't look like a valid email address.",
        "auth/too-many-requests": "Too many failed attempts. Please wait a moment and try again.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
        "auth/operation-not-allowed": "Email/Password sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method and enable it.",
    };
    return map[code] || err?.message || "Something went wrong. Please try again.";
}

// ── Icons ──
function IconFan({ className = "" }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <path stroke="currentColor" strokeWidth="1.8" d="M12 12m-2.25 0a2.25 2.25 0 1 0 4.5 0a2.25 2.25 0 1 0-4.5 0" />
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M12 4.5c1.8 0 2.7 2.25 2.7 3.6 0 1.35-.9 2.4-2.7 2.4" />
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M19.5 12c0 1.8-2.25 2.7-3.6 2.7-1.35 0-2.4-.9-2.4-2.7" />
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M12 19.5c-1.8 0-2.7-2.25-2.7-3.6 0-1.35.9-2.4 2.7-2.4" />
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M4.5 12c0-1.8 2.25-2.7 3.6-2.7 1.35 0 2.4.9 2.4 2.7" />
        </svg>
    );
}
function IconLight({ className = "" }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 18h6m-5 3h4M12 2a7 7 0 0 0-4 12.7c.6.8 1 1.8 1 3.3h6c0-1.5.4-2.5 1-3.3A7 7 0 0 0 12 2z"/>
        </svg>
    );
}
function IconAC({ className = "" }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <rect x="2" y="4" width="20" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/>
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M6 12h12"/>
            <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" d="M8 20c0-2 1-4 4-4s4 2 4 4"/>
        </svg>
    );
}
function IconTV({ className = "" }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <rect x="2" y="5" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M8 22h8M12 18v4"/>
        </svg>
    );
}
function IconHome({ className = "" }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10.5z"/>
            <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M9 22V14h6v8"/>
        </svg>
    );
}

const base = import.meta.env.BASE_URL;
const DEVICE_CATALOG = {
    fan:   { name: "Ceiling Fan",     icon: IconFan,   img: `${base}devices/fan.png` },
    light: { name: "Smart Light",     icon: IconLight,  img: `${base}devices/light.png` },
    ac:    { name: "Air Conditioner", icon: IconAC,    img: `${base}devices/ac.png` },
    tv:    { name: "Television",      icon: IconTV,    img: `${base}devices/tv.png` }
};

function GlassCard({ children, className = "", onClick }) {
    return (
        <div onClick={onClick} className={`rounded-3xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-2xl ${onClick ? "cursor-pointer transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]" : ""} ${className}`}>
            {children}
        </div>
    );
}

function InputField({ label, ...props }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 pl-1">{label}</label>
            <input
                {...props}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 focus:bg-slate-950/70"
            />
        </div>
    );
}

export default function App() {
    const [viewer, setViewer] = useState(null);
    const [devices, setDevices] = useState(null);
    const [loading, setLoading] = useState(true);

    const [authMode, setAuthMode] = useState("login");
    const [loginIdentifier, setLoginIdentifier] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [authError, setAuthError] = useState("");
    const [authSuccess, setAuthSuccess] = useState("");
    const [authLoading, setAuthLoading] = useState(false);

    const [showAddDevice, setShowAddDevice] = useState(false);
    const [selectedDeviceType, setSelectedDeviceType] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setViewer(user);
            setLoading(false);
            if (user) {
                onValue(ref(db, `users/${user.uid}/devices`), (snap) => {
                    setDevices(snap.val() || {});
                });
            } else {
                setDevices(null);
            }
        });
        return () => unsub();
    }, []);

    async function handleLogin(e) {
        e.preventDefault();
        setAuthError(""); setAuthLoading(true);
        try {
            let targetEmail = loginIdentifier.trim();
            if (!targetEmail) throw { code: "", message: "Please enter your username or email." };
            if (!password) throw { code: "", message: "Please enter your password." };

            if (!isEmail(targetEmail)) {
                const clean = slugify(targetEmail);
                if (!clean) throw { code: "", message: "That doesn't look like a valid username." };
                const snap = await get(child(ref(db), `usernames/${clean}`));
                if (!snap.exists()) throw { code: "", message: `No account found with username "${clean}". Check spelling or register a new account.` };
                targetEmail = snap.val().email;
            }
            await signInWithEmailAndPassword(auth, targetEmail, password);
        } catch (err) {
            setAuthError(friendlyError(err));
        } finally { setAuthLoading(false); }
    }

    async function handleRegister(e) {
        e.preventDefault();
        setAuthError(""); setAuthLoading(true);
        try {
            const cleanUser = slugify(username);
            const cleanEmail = email.trim().toLowerCase();
            if (!fullName.trim()) throw { code: "", message: "Please enter your full name." };
            if (!cleanUser) throw { code: "", message: "Username can only contain letters, numbers, and underscores." };
            if (cleanUser.length < 3) throw { code: "", message: "Username must be at least 3 characters long." };
            if (!isEmail(cleanEmail)) throw { code: "", message: "Please enter a valid email address." };
            if (password.length < 6) throw { code: "", message: "Password must be at least 6 characters." };

            const snap = await get(child(ref(db), `usernames/${cleanUser}`));
            if (snap.exists()) throw { code: "", message: `The username "${cleanUser}" is already taken. Try a different one.` };

            const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            await updateProfile(cred.user, { displayName: fullName.trim() });
            await set(ref(db, `usernames/${cleanUser}`), { email: cleanEmail, uid: cred.user.uid, name: fullName.trim() });
        } catch (err) {
            setAuthError(friendlyError(err));
        } finally { setAuthLoading(false); }
    }

    async function handleForgotPassword(e) {
        e.preventDefault();
        setAuthError(""); setAuthSuccess(""); setAuthLoading(true);
        try {
            const resetEmail = email.trim().toLowerCase();
            if (!isEmail(resetEmail)) throw { code: "", message: "Please enter a valid email address." };
            await sendPasswordResetEmail(auth, resetEmail);
            setAuthSuccess("Password reset email sent. Check your inbox.");
        } catch (err) {
            setAuthError(friendlyError(err));
        } finally { setAuthLoading(false); }
    }

    async function toggleDevice(id, cur) {
        if (!viewer) return;
        await set(ref(db, `users/${viewer.uid}/devices/${id}/state`), cur === 1 ? 0 : 1);
    }

    async function removeDevice(id) {
        if (!viewer) return;
        if (!window.confirm("Are you sure you want to remove this device?")) return;
        await remove(ref(db, `users/${viewer.uid}/devices/${id}`));
    }

    async function simulateDevice(type) {
        if (!viewer) return;
        const id = `${type}_${Date.now().toString().slice(-6)}`;
        await set(ref(db, `users/${viewer.uid}/devices/${id}`), { type, name: DEVICE_CATALOG[type].name, state: 0 });
        closeModal();
    }

    function closeModal() { setShowAddDevice(false); setSelectedDeviceType(null); }

    const bg = "bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.12),transparent_50%),linear-gradient(to_bottom,#030712,#0c1222)]";

    if (loading) {
        return (
            <div className={`min-h-screen ${bg} grid place-items-center`}>
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <IconHome className="h-10 w-10 animate-pulse" />
                    <p className="text-sm font-medium">Loading your home...</p>
                </div>
            </div>
        );
    }

    const hasDevices = devices && Object.keys(devices).length > 0;

    return (
        <div className={`min-h-screen text-white ${bg} relative`}>
            {/* ── Add Device Modal ── */}
            {showAddDevice && viewer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg p-4" onClick={closeModal}>
                    <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/90 backdrop-blur-2xl p-6 lg:p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={closeModal} className="absolute top-5 right-5 h-8 w-8 grid place-items-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition">✕</button>

                        {!selectedDeviceType ? (
                            <>
                                <h2 className="text-2xl font-bold mb-1">Add New Device</h2>
                                <p className="text-sm text-slate-400 mb-8">What kind of hardware are you connecting?</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(DEVICE_CATALOG).map(([key, cfg]) => {
                                        const Icon = cfg.icon;
                                        return (
                                            <button key={key} onClick={() => setSelectedDeviceType(key)} className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex flex-col items-center gap-3 transition-all hover:bg-cyan-400/10 hover:border-cyan-400/30 hover:scale-105 active:scale-95">
                                                <div className="h-14 w-14 grid place-items-center rounded-2xl bg-cyan-400/10 text-cyan-400 group-hover:bg-cyan-400/20 transition">
                                                    <Icon className="h-7 w-7" />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-200">{cfg.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setSelectedDeviceType(null)} className="mb-5 text-sm text-cyan-400 hover:underline inline-flex items-center gap-1">← Back</button>
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold">Connect {DEVICE_CATALOG[selectedDeviceType].name}</h2>
                                </div>
                                <p className="text-sm text-slate-400 mb-5">Flash this code to your ESP32. It binds this device to your account.</p>

                                <button
                                    onClick={() => simulateDevice(selectedDeviceType)}
                                    className="mb-5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-95"
                                >
                                    Quick Simulate Instead
                                </button>

                                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
{`#include <WiFi.h>
#include <FirebaseESP32.h>

#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

#define API_KEY "${firebaseConfig.apiKey}"
#define DATABASE_URL "${firebaseConfig.databaseURL}"
#define USER_EMAIL "${viewer.email}"
#define USER_PASSWORD "YOUR_ACCOUNT_PASSWORD"
#define USER_UID "${viewer.uid}"
#define DEVICE_KEY "${selectedDeviceType}_device_1"
#define RELAY_PIN 14

FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);

  Serial.println();
  Serial.print("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  Serial.println("Initializing Firebase...");
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  String path = String("/users/") + USER_UID + "/devices/" + DEVICE_KEY + "/state";
  
  Serial.println("Starting stream at: " + path);
  if (!Firebase.beginStream(firebaseData, path)) {
    Serial.println("Stream begin failed: " + firebaseData.errorReason());
  }
}

void loop() {
  if (Firebase.ready()) {
    if (Firebase.readStream(firebaseData)) {
      if (firebaseData.streamAvailable()) {
        int state = firebaseData.intData();
        Serial.print("Update received! New state: ");
        Serial.println(state);
        digitalWrite(RELAY_PIN, state == 1 ? HIGH : LOW);
      }
    } else {
      Serial.println("Stream error: " + firebaseData.errorReason());
    }
  }
}`}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
                {/* ── Header ── */}
                <header className="mb-8 flex items-center justify-between rounded-3xl border border-white/[0.06] bg-white/[0.03] px-5 py-3 backdrop-blur-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 grid place-items-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-400 ring-1 ring-cyan-500/20">
                            <IconHome className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight sm:text-lg">Smart Home</h1>
                            <p className="text-[11px] text-slate-500">Secure Ecosystem</p>
                        </div>
                    </div>
                    {viewer && (
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 grid place-items-center text-[10px] font-bold text-white">
                                    {(viewer.displayName || "U")[0].toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-slate-300">{viewer.displayName || "User"}</span>
                            </div>
                            <button onClick={() => signOut(auth)} className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition">
                                Sign Out
                            </button>
                        </div>
                    )}
                </header>

                {/* ── Auth ── */}
                {!viewer ? (
                    <main className="grid flex-1 place-items-center pb-16">
                        <div className="w-full max-w-sm">
                            <div className="text-center mb-8">
                                <div className="mx-auto mb-5 h-16 w-16 grid place-items-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 ring-1 ring-cyan-500/15">
                                    <IconHome className="h-8 w-8 text-cyan-400" />
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight">{authMode === "login" ? "Welcome back" : authMode === "forgot" ? "Reset Password" : "Create your account"}</h2>
                                <p className="mt-2 text-sm text-slate-500">{authMode === "login" ? "Sign in to access your devices" : authMode === "forgot" ? "We'll send you an email to reset it" : "Set up your profile to get started"}</p>
                            </div>

                            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
                                {authError && (
                                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.08] p-3.5">
                                        <span className="text-rose-400 text-lg leading-none mt-0.5">⚠</span>
                                        <p className="text-sm text-rose-200/90 leading-relaxed">{authError}</p>
                                    </div>
                                )}
                                {authSuccess && (
                                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-3.5">
                                        <span className="text-emerald-400 text-lg leading-none mt-0.5">✓</span>
                                        <p className="text-sm text-emerald-200/90 leading-relaxed">{authSuccess}</p>
                                    </div>
                                )}

                                {authMode === "login" ? (
                                    <form className="space-y-4" onSubmit={handleLogin}>
                                        <InputField label="Username or Email" type="text" placeholder="e.g. sourav or you@mail.com" value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} required />
                                        <InputField label="Password" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required />
                                        <div className="flex justify-end">
                                            <button type="button" onClick={() => { setAuthError(""); setAuthSuccess(""); setAuthMode("forgot"); }} className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition">Forgot Password?</button>
                                        </div>
                                        <button disabled={authLoading} className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 p-3 text-sm font-bold text-slate-950 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                                            {authLoading ? "Signing in..." : "Sign In"}
                                        </button>
                                    </form>
                                ) : authMode === "forgot" ? (
                                    <form className="space-y-4" onSubmit={handleForgotPassword}>
                                        <InputField label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                        <button disabled={authLoading} className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 p-3 text-sm font-bold text-slate-950 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                                            {authLoading ? "Sending..." : "Send Reset Link"}
                                        </button>
                                        <button type="button" onClick={() => { setAuthError(""); setAuthSuccess(""); setAuthMode("login"); }} className="w-full text-center text-sm font-semibold text-slate-400 hover:text-white transition mt-2">
                                            Back to login
                                        </button>
                                    </form>
                                ) : (
                                    <form className="space-y-4" onSubmit={handleRegister}>
                                        <InputField label="Full Name" type="text" placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                                        <InputField label="Username" type="text" placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)} required />
                                        <InputField label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                                        <InputField label="Password" type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
                                        <button disabled={authLoading} className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 p-3 text-sm font-bold text-slate-950 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                                            {authLoading ? "Creating account..." : "Create Account"}
                                        </button>
                                    </form>
                                )}
                            </div>

                            {authMode !== "forgot" && (
                                <p className="mt-6 text-center text-sm text-slate-500">
                                    {authMode === "login" ? "Don't have an account? " : "Already registered? "}
                                    <button onClick={() => { setAuthError(""); setAuthSuccess(""); setAuthMode(authMode === "login" ? "register" : "login"); }} className="font-semibold text-cyan-400 hover:text-cyan-300 transition">
                                        {authMode === "login" ? "Register" : "Sign in"}
                                    </button>
                                </p>
                            )}
                        </div>
                    </main>
                ) : (
                    /* ── Dashboard ── */
                    <main className="flex-1 flex flex-col pb-10">
                        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Devices</h2>
                                <p className="text-sm text-slate-500 mt-1">{hasDevices ? `${Object.keys(devices).length} device${Object.keys(devices).length > 1 ? "s" : ""} connected` : "No devices yet"}</p>
                            </div>
                            <button onClick={() => setShowAddDevice(true)} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                                <span className="text-lg leading-none">+</span> Add Device
                            </button>
                        </div>

                        {!hasDevices ? (
                            <div className="grid flex-1 place-items-center text-center">
                                <div className="max-w-sm">
                                    <div className="mx-auto mb-6 h-24 w-24 grid place-items-center rounded-3xl bg-slate-800/50 ring-1 ring-white/5">
                                        <IconFan className="h-10 w-10 text-slate-600" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">No devices connected</h3>
                                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">Start building your smart home by adding your first device. You can connect real ESP32 hardware or simulate one to explore the dashboard.</p>
                                    <button onClick={() => setShowAddDevice(true)} className="rounded-2xl bg-white text-slate-900 px-6 py-3 text-sm font-bold hover:bg-slate-100 transition active:scale-95">
                                        Add Your First Device
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {Object.entries(devices).map(([deviceId, data]) => {
                                    const on = data.state === 1;
                                    const cfg = DEVICE_CATALOG[data.type] || DEVICE_CATALOG.fan;
                                    const Icon = cfg.icon;
                                    return (
                                        <div key={deviceId} className="group rounded-3xl border border-white/[0.06] bg-white/[0.03] overflow-hidden transition-all hover:border-white/10 hover:bg-white/[0.05]">
                                            <div className="relative h-36 overflow-hidden">
                                                <img src={cfg.img} className="h-full w-full object-cover transition-transform group-hover:scale-105" alt={cfg.name} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
                                                <div className="absolute top-3 right-3">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${on ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30" : "bg-slate-800/60 text-slate-400 ring-1 ring-white/10"}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-400" : "bg-slate-500"}`}></span>
                                                        {on ? "Active" : "Off"}
                                                    </span>
                                                </div>
                                                <div className="absolute bottom-3 left-4">
                                                    <h4 className="text-base font-bold text-white">{data.name}</h4>
                                                    <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{data.type}</p>
                                                </div>
                                            </div>
                                            <div className="p-4 flex items-center justify-between">
                                                <div className={`h-10 w-10 grid place-items-center rounded-xl ring-1 transition-all ${on ? "bg-cyan-500/15 text-cyan-400 ring-cyan-500/25" : "bg-white/5 text-slate-500 ring-white/10"}`}>
                                                    <Icon className={`h-5 w-5 ${data.type === "fan" && on ? "animate-[spin_1.5s_linear_infinite]" : ""}`} />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => removeDevice(deviceId)}
                                                        className="h-8 w-8 grid place-items-center rounded-lg bg-white/5 text-slate-500 ring-1 ring-white/10 hover:bg-rose-500/15 hover:text-rose-400 hover:ring-rose-500/30 transition"
                                                        title="Remove device"
                                                    >
                                                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd"/></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => toggleDevice(deviceId, data.state)}
                                                        className={`relative h-8 w-14 rounded-full transition-all ${on ? "bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]" : "bg-slate-700"}`}
                                                    >
                                                        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-7" : "left-1"}`}></span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </main>
                )}
            </div>
        </div>
    );
}
