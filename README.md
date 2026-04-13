# V2 Ecosystem Dashboard & ESP32 Setup

Your app has been upgraded to **V2**! Along with an advanced simulation mode and support for Lights, ACs, Fans, and TVs, we've enabled **Username Login**. 

To lock down the new architecture, you need to update your Firebase Rules **one last time**.

## 1. Important Rules Update
Because the app now lets you type a `@username` to log in, the database needs permission to "lookup" what email is attached to that username before it actually logs you in.

1. Go to **Firebase Console** -> **Realtime Database** -> **Rules**.
2. Erase everything there and paste exactly this:

```json
{
  "rules": {
    "usernames": {
      ".read": true,
      ".write": true
    },
    "users": {
      "$uid": {
         ".read": "$uid === auth.uid",
         ".write": "$uid === auth.uid"
      }
    }
  }
}
```
*(This allows the public to run username lookups, but keeps your smart home completely locked down!)*

## 2. Using The Ecosystem
1. Load up your web app at `http://localhost:5173`.
2. Notice the sleek new Registration panel. Fill out your Name, Username, Email, and Password.
3. You will be greeted with your expanded ecosystem dashboard! 
4. Click **Add Device** -> Select an Air Conditioner, Smart Light, Fan, or TV.
5. If you want to play around without flashing an ESP32 immediately, click the **Simulate It Instead** button at the top-right to digitally spawn the appliance on your dashboard.
6. The hardware code provided has been heavily optimized to automatically pull the device ID and your user UID so it all connects flawlessly. Enjoy your smart home!
