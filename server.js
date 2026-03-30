const { Server, Room } = require("colyseus");
const { Schema, MapSchema, type } = require("@colyseus/schema");
const express = require("express");
const http = require("http");
const path = require("path");

// ========== 1. SABİTLER ==========
const PORT = process.env.PORT || 2567;
const PLAYER_RADIUS = 1.0;
const WORLD_MIN = -50;
const WORLD_MAX = 50;
const MAX_MOVEMENT_STEP = 0.25;

// ========== 2. ŞEMA TANIMLARI ==========
class Oyuncu extends Schema {
    constructor() {
        super();
        this.id = "";
        this.isim = "";
        this.tasTipi = "piyon";
        this.can = 100;
        this.x = 0;
        this.z = 0;
        this.takim = 0;
    }
}
type("string")(Oyuncu.prototype, "id");
type("string")(Oyuncu.prototype, "isim");
type("string")(Oyuncu.prototype, "tasTipi");
type("number")(Oyuncu.prototype, "can");
type("number")(Oyuncu.prototype, "x");
type("number")(Oyuncu.prototype, "z");
type("number")(Oyuncu.prototype, "takim");

class OyunDurumu extends Schema {
    constructor() {
        super();
        this.oyuncular = new MapSchema();
    }
}
type({ map: Oyuncu })(OyunDurumu.prototype, "oyuncular");

// ========== 3. STATİK ENGELLER (AŞAMA 1) ==========
const staticObstacles = [
    // Ağaçlar
    { type: "tree", x: 10,  z: 10,  radius: 1.5 },
    { type: "tree", x: -15, z: 5,   radius: 1.5 },
    { type: "tree", x: 20,  z: -20, radius: 1.5 },
    { type: "tree", x: -25, z: 15,  radius: 1.5 },
    { type: "tree", x: 5,   z: -30, radius: 1.5 },
    { type: "tree", x: -10, z: -10, radius: 1.5 },
    { type: "tree", x: 30,  z: 5,   radius: 1.5 },
    { type: "tree", x: -35, z: -20, radius: 1.5 },
    { type: "tree", x: 15,  z: 35,  radius: 1.5 },
    { type: "tree", x: -5,  z: 40,  radius: 1.5 },
    // Kayalar
    { type: "rock", x: -20, z: -5,  radius: 1.2 },
    { type: "rock", x: 25,  z: -15, radius: 1.0 },
    { type: "rock", x: -40, z: 10,  radius: 1.3 },
    { type: "rock", x: 35,  z: 25,  radius: 1.1 },
    { type: "rock", x: -8,  z: 20,  radius: 1.0 },
    // Duvarlar
    { type: "wall", x: 0,   z: -20, width: 12, depth: 1.5 },
    { type: "wall", x: -20, z: 0,   width: 1.5, depth: 12 },
    { type: "wall", x: 20,  z: 10,  width: 8,  depth: 1.5 },
    { type: "wall", x: 10,  z: -35, width: 1.5, depth: 8  },
    { type: "wall", x: -30, z: -30, width: 10, depth: 1.5 },
];

// ========== 4. ÇARPIŞMA FONKSİYONLARI ==========

// 4.1 Daire-daire çarpışması
function circleCollision(px, pz, pr, cx, cz, cr) {
    const dx = px - cx;
    const dz = pz - cz;
    const distSq = dx * dx + dz * dz;
    const minDist = pr + cr;
    return distSq < minDist * minDist;
}

// 4.2 Dikdörtgen (AABB) – daire çarpışması
function rectCircleCollision(px, pz, pr, rx, rz, rw, rd) {
    const halfW = rw / 2;
    const halfD = rd / 2;
    const left = rx - halfW;
    const right = rx + halfW;
    const top = rz - halfD;
    const bottom = rz + halfD;

    const closestX = Math.max(left, Math.min(px, right));
    const closestZ = Math.max(top, Math.min(pz, bottom));
    const dx = px - closestX;
    const dz = pz - closestZ;
    const distSq = dx * dx + dz * dz;
    return distSq < pr * pr;
}

// 4.3 Ana çarpışma kontrolü (statik + dinamik + sınır)
function hasCollision(oyuncuId, x, z, radius, state) {
    // Statik engeller
    for (let obs of staticObstacles) {
        if (obs.type === "wall") {
            if (rectCircleCollision(x, z, radius, obs.x, obs.z, obs.width, obs.depth))
                return true;
        } else {
            if (circleCollision(x, z, radius, obs.x, obs.z, obs.radius))
                return true;
        }
    }
    // Diğer oyuncular
    for (let [id, other] of state.oyuncular.entries()) {
        if (id === oyuncuId) continue;
        if (circleCollision(x, z, radius, other.x, other.z, PLAYER_RADIUS))
            return true;
    }
    // Dünya sınırları
    if (x < WORLD_MIN || x > WORLD_MAX || z < WORLD_MIN || z > WORLD_MAX)
        return true;

    return false;
}

// 4.4 Kayma (slide) algoritması
function resolveSlide(oyuncuId, oldX, oldZ, newX, newZ, radius, state) {
    let finalX = oldX, finalZ = oldZ;

    // Önce sadece X ekseninde dene
    if (!hasCollision(oyuncuId, newX, oldZ, radius, state)) {
        finalX = newX;
    }

    // Sonra sadece Z ekseninde dene (mevcut finalX ile)
    if (!hasCollision(oyuncuId, finalX, newZ, radius, state)) {
        finalZ = newZ;
    }

    // Hâlâ çarpışma varsa eski konuma dön
    if (hasCollision(oyuncuId, finalX, finalZ, radius, state)) {
        return { x: oldX, z: oldZ };
    }

    return { x: finalX, z: finalZ };
}

// ========== 5. ODA SINIFI ==========

// Engelsiz bir başlangıç konumu bul
function safeSpawnPosition(state) {
    const dummyState = { oyuncular: state.oyuncular };
    for (let attempt = 0; attempt < 50; attempt++) {
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        if (!hasCollision("__spawn__", x, z, PLAYER_RADIUS, dummyState)) {
            return { x, z };
        }
    }
    // Fallback: merkeze yakın güvenli nokta
    return { x: 0, z: 0 };
}
class OyunOdasi extends Room {
    tasCan(tip) {
        const canTablosu = {
            piyon: 100,
            kale: 200,
            at: 150,
            fil: 150,
            vezir: 250,
            sah: 300,
        };
        return canTablosu[tip] || 100;
    }

    onCreate(options) {
        this.setState(new OyunDurumu());

        this.onMessage("hareket", (client, data) => {
            const oyuncu = this.state.oyuncular.get(client.sessionId);
            if (!oyuncu) return;

            let dx = data.dx || 0;
            let dz = data.dz || 0;

            // Maksimum adım boyutu (hız sınırlaması)
            dx = Math.min(MAX_MOVEMENT_STEP, Math.max(-MAX_MOVEMENT_STEP, dx));
            dz = Math.min(MAX_MOVEMENT_STEP, Math.max(-MAX_MOVEMENT_STEP, dz));

            // Aday yeni konum
            const newX = oyuncu.x + dx;
            const newZ = oyuncu.z + dz;

            // Çarpışma ve kaymayı uygula
            const { x: finalX, z: finalZ } = resolveSlide(
                client.sessionId,
                oyuncu.x, oyuncu.z,
                newX, newZ,
                PLAYER_RADIUS,
                this.state
            );

            oyuncu.x = finalX;
            oyuncu.z = finalZ;
        });
    }

    onJoin(client, options) {
        const yeni = new Oyuncu();
        yeni.id = client.sessionId;
        yeni.isim = options.isim || "İsimsiz";
        yeni.tasTipi = options.tasTipi || "piyon";
        yeni.can = this.tasCan(yeni.tasTipi);
        const { x: spawnX, z: spawnZ } = safeSpawnPosition(this.state);
        yeni.x = spawnX;
        yeni.z = spawnZ;
        yeni.takim = options.takim || Math.floor(Math.random() * 4);
        this.state.oyuncular.set(client.sessionId, yeni);

        // Engelleri bu oyuncuya gönder
        client.send("engeller", staticObstacles);
    }

    onLeave(client) {
        this.state.oyuncular.delete(client.sessionId);
    }
}

// ========== 6. SUNUCU BAŞLATMA ==========
const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const gameServer = new Server({ server });
gameServer.define("oyun_odasi", OyunOdasi);
gameServer.listen(PORT).then(() => {
    console.log(`Oyun sunucusu ${PORT} portunda çalışıyor.`);
});
