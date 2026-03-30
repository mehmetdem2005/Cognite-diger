// ========== MODEL OLUŞTURMA FONKSİYONLARI (AŞAMA 5) ==========

function createTreeModel(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.7, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x8B5A2B })
    );
    trunk.position.y = -0.4;
    trunk.castShadow = true;
    const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(0.7, 1.0, 6),
        new THREE.MeshStandardMaterial({ color: 0x3c9e3c })
    );
    foliage.position.y = 0.3;
    foliage.castShadow = true;
    group.add(trunk, foliage);
    group.position.set(x, -0.8, z);
    return group;
}

function createRockModel(x, z, radius) {
    const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(radius * 0.8),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 })
    );
    rock.position.set(x, -0.5, z);
    rock.scale.set(1, 0.6, 1);
    rock.castShadow = true;
    return rock;
}

function createWallModel(x, z, width, depth) {
    const wall = new THREE.Mesh(
        new THREE.BoxGeometry(width, 1.5, depth),
        new THREE.MeshStandardMaterial({ color: 0xaa8866 })
    );
    wall.position.set(x, -0.2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
}

// ========== SAHNE ==========
let scene, camera, renderer;
let room = null;
const playerMeshes = {};
let mySessionId = null;

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 40, 100);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 12, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Işıklar
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -60;
    dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60;
    dirLight.shadow.camera.bottom = -60;
    scene.add(dirLight);

    // Zemin
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 120),
        new THREE.MeshStandardMaterial({ color: 0x5a8a3c, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    scene.add(ground);

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ========== OYUNCU MESHLERİ ==========
const takimRenkleri = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12];

function getPlayerColor(takim) {
    return takimRenkleri[takim % takimRenkleri.length] || 0xffffff;
}

function createPlayerMesh(oyuncu) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.0, 1.0),
        new THREE.MeshStandardMaterial({ color: getPlayerColor(oyuncu.takim) })
    );
    body.castShadow = true;
    group.add(body);
    group.position.set(oyuncu.x, 0, oyuncu.z);
    scene.add(group);
    return group;
}

// ========== GİRİŞ ==========
const keys = {};
window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup",   (e) => { keys[e.code] = false; });

// ========== OYUNA KATIL ==========
function joinGame(isim, tasTipi) {
    const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = location.hostname === "localhost"
        ? "ws://localhost:2567"
        : `${wsProtocol}//${location.host}`;

    const client = new Colyseus.Client(wsUrl);

    client.joinOrCreate("oyun_odasi", { isim, tasTipi }).then((r) => {
        room = r;
        mySessionId = room.sessionId;

        document.getElementById("loginPanel").style.display = "none";
        document.getElementById("ui").style.display = "block";

        room.onStateChange((state) => {
            // Yeni oyuncular için mesh oluştur
            state.oyuncular.forEach((oyuncu, id) => {
                if (!playerMeshes[id]) {
                    playerMeshes[id] = createPlayerMesh(oyuncu);
                }
            });
        });

        // ✅ AŞAMA 5: Engelleri sunucudan al ve 3D modelleri oluştur
        room.onMessage("engeller", (obstacles) => {
            obstacles.forEach(obs => {
                if (obs.type === "tree") {
                    const tree = createTreeModel(obs.x, obs.z);
                    scene.add(tree);
                } else if (obs.type === "rock") {
                    const rock = createRockModel(obs.x, obs.z, obs.radius);
                    scene.add(rock);
                } else if (obs.type === "wall") {
                    const wall = createWallModel(obs.x, obs.z, obs.width, obs.depth);
                    scene.add(wall);
                }
            });
        });

        room.onLeave(() => {
            Object.values(playerMeshes).forEach(m => scene.remove(m));
            for (const id in playerMeshes) delete playerMeshes[id];
            room = null;
        });
    }).catch((err) => {
        console.error("Bağlantı hatası:", err);
        alert("Sunucuya bağlanılamadı: " + err.message);
    });
}

// ========== OYUN DÖNGÜSÜ ==========
const SPEED = 0.18;

function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (room) {
        let dx = 0, dz = 0;
        if (keys["KeyW"] || keys["ArrowUp"])    dz -= SPEED;
        if (keys["KeyS"] || keys["ArrowDown"])  dz += SPEED;
        if (keys["KeyA"] || keys["ArrowLeft"])  dx -= SPEED;
        if (keys["KeyD"] || keys["ArrowRight"]) dx += SPEED;

        if (dx !== 0 || dz !== 0) {
            room.send("hareket", { dx, dz });
        }

        // Oyuncu meshlerini güncelle
        if (room.state && room.state.oyuncular) {
            room.state.oyuncular.forEach((oyuncu, id) => {
                if (playerMeshes[id]) {
                    playerMeshes[id].position.x = oyuncu.x;
                    playerMeshes[id].position.z = oyuncu.z;
                } else {
                    playerMeshes[id] = createPlayerMesh(oyuncu);
                }
            });

            // Ayrılan oyuncuların meshlerini sil
            for (const id in playerMeshes) {
                if (!room.state.oyuncular.has(id)) {
                    scene.remove(playerMeshes[id]);
                    delete playerMeshes[id];
                }
            }
        }

        // Kamerayı kendi oyuncuya kilitle
        if (mySessionId && room.state.oyuncular.has(mySessionId)) {
            const me = room.state.oyuncular.get(mySessionId);
            camera.position.set(me.x, 12, me.z + 20);
            camera.lookAt(me.x, 0, me.z);

            const info = document.getElementById("playerInfo");
            if (info) {
                info.textContent = `HP: ${me.can} | Konum: (${me.x.toFixed(1)}, ${me.z.toFixed(1)})`;
            }
        }
    }

    renderer.render(scene, camera);
}

// ========== BAŞLAT ==========
initScene();
gameLoop();

document.getElementById("joinBtn").addEventListener("click", () => {
    const isim = document.getElementById("isimInput").value.trim() || "İsimsiz";
    const tasTipi = document.getElementById("tasSelect").value;
    joinGame(isim, tasTipi);
});

document.getElementById("isimInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("joinBtn").click();
});
