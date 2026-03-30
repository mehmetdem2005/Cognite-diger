const colyseus = require("colyseus");
const { Schema, MapSchema, type } = require("@colyseus/schema");

// ========== 1. SABITLER ==========
const PLAYER_RADIUS = 1.0;
const WORLD_MIN = -50;
const WORLD_MAX = 50;

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

class OyunState extends Schema {
    constructor() {
        super();
        this.oyuncular = new MapSchema();
    }
}
type({ map: Oyuncu })(OyunState.prototype, "oyuncular");

// ========== 3. STATİK ENGELLER ==========
const staticObstacles = [
    { type: "tree",  x: 10,  z: 10,  radius: 1.5 },
    { type: "tree",  x: -15, z: 20,  radius: 1.5 },
    { type: "tree",  x: 25,  z: -10, radius: 1.5 },
    { type: "rock",  x: -5,  z: -20, radius: 2.0 },
    { type: "rock",  x: 20,  z: 15,  radius: 2.5 },
    { type: "wall",  x: 0,   z: -30, width: 20, depth: 2 },
    { type: "wall",  x: -30, z: 0,   width: 2,  depth: 20 },
];

// ========== 4. ÇARPŞMA FONKSİYONLARI ==========

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

// ========== 5. OYUN ODASI ==========
class OyunOdasi extends colyseus.Room {
    onCreate(options) {
        this.setState(new OyunState());

        this.onMessage("hareket", (client, data) => {
            const oyuncu = this.state.oyuncular.get(client.sessionId);
            if (!oyuncu) return;

            let dx = data.dx || 0;
            let dz = data.dz || 0;

            // Maksimum adım boyutu (hız sınırlaması)
            const maxStep = 0.25;
            dx = Math.min(maxStep, Math.max(-maxStep, dx));
            dz = Math.min(maxStep, Math.max(-maxStep, dz));

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

    tasCan(tasTipi) {
        const canMap = {
            piyon: 100,
            kale: 200,
            at: 150,
            fil: 150,
            vezir: 250,
            sah: 300,
        };
        return canMap[tasTipi] || 100;
    }

    onJoin(client, options) {
        const yeni = new Oyuncu();
        yeni.id = client.sessionId;
        yeni.isim = options.isim || "İsimsiz";
        yeni.tasTipi = options.tasTipi || "piyon";
        yeni.can = this.tasCan(yeni.tasTipi);
        yeni.x = (Math.random() - 0.5) * 80;
        yeni.z = (Math.random() - 0.5) * 80;
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
const gameServer = new colyseus.Server();
gameServer.define("oyun", OyunOdasi);
gameServer.listen(2567);
console.log("Sunucu 2567 portunda çalışıyor.");
