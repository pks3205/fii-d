# GOLD OS Android source

Native Android Studio source for the Compose dashboard, provider/repository separation, Room cache, lifecycle-aware refresh, WorkManager cache refresh, Glance home-screen widget and static-art wallpaper service.

Open this directory in Android Studio with **JDK 17** and **Android SDK Platform 35** installed. Build with `:app:assembleDebug`.

The Arena preview environment has no Java/Android SDK, so this project has not been compiled here and no APK is included. The browser preview in the repository root is the working visual prototype.

The live wallpaper service only paints the bundled static artwork (and redraws on visibility/surface changes); it intentionally does not run a market feed in the wallpaper. The app/widget use the market repository and visibly label demo, live, cached, delayed or unavailable data.
