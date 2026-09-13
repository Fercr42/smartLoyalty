import { firebaseConfig } from "../firebase/config";

// Service worker generado para poder usar la config de Firebase desde env.
export function GET() {
  const script = `
importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js");
firebase.initializeApp(${JSON.stringify(firebaseConfig)});
firebase.messaging();
`;
  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
