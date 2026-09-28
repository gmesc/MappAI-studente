// swift-tools-version: 5.9
import PackageDescription

// Il nome del pacchetto e del prodotto è quello che il CLI di Capacitor ricava
// dal nome npm (`fixName("mappai-stampa")` = «MappaiStampa»): `npx cap sync ios`
// scrive `.product(name: "MappaiStampa", package: "MappaiStampa")` in CapApp-SPM.
let package = Package(
    name: "MappaiStampa",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "MappaiStampa",
            targets: ["StampaPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "StampaPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/StampaPlugin")
    ]
)
