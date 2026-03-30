import * as THREE from 'three';
import { Client } from 'colyseus.js';
import nipplejs from 'nipplejs';

const client = new Client('ws://localhost:3000');
let room;
let scene, camera, renderer, playerMesh;
let otherPlayers = new Map();

// Sahne kurulumu
scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Basit arazi
const groundMat = new THREE.MeshStandardMaterial({ color: 0x5c9e5e });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
ground.rotation.x = -Math.PI/2;
ground.position.y = -1;
scene.add(ground);

// Rastgele ağaçlar
for(let i=0; i<200; i++) {
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,1), treeMat);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x3c9e3c });
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.8,1.2,8), topMat);
    trunk.position.set((Math.random() - 0.5)*180, -0.5, (Math.random() - 0.5)*180);
    top.position.set(trunk.position.x, trunk.position.y+1, trunk.position.z);
    scene.add(trunk, top);
}

// Işık
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10,20,5);
scene.add(light);
const ambient = new THREE.AmbientLight(0x404040);
scene.add(ambient);

// Oyuncunun kendi modeli (küp)
playerMesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: 0xff6600 }));
scene.add(playerMesh);
camera.position.set(0, 5, 10);
camera.lookAt(playerMesh.position);

// Diğer oyuncuları tutacak Map
function updateOtherPlayers(state) {
    for(let [id, oyuncu] of Object.entries(state.oyuncular)) {
        if(id === room.sessionId) continue;
        if(!otherPlayers.has(id)) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({ color: 0x3399ff }));
            scene.add(mesh);
            otherPlayers.set(id, mesh);
        }
        const mesh = otherPlayers.get(id);
        mesh.position.set(oyuncu.x, 0, oyuncu.z);
    }
    // silinenler
    for(let [id, mesh] of otherPlayers.entries()) {
        if(!state.oyuncular[id]) {
            scene.remove(mesh);
            otherPlayers.delete(id);
        }
    }
}

// Odaya katıl
async function joinGame() {
    room = await client.joinOrCreate("satranc", {
        isim: "Oyuncu_" + Math.floor(Math.random()*1000),
        tasTipi: "piyon"
    });
    console.log("Odadayız", room.sessionId);
    
    room.onStateChange((state) => {
        // kendi can ve taş tipini güncelle
        const me = state.oyuncular[room.sessionId];
        if(me) {
            document.getElementById("canbar").innerHTML = `❤️ Can: ${me.can}`;
            document.getElementById("tasTipi").innerHTML = `♟️ ${me.tasTipi.toUpperCase()}`;
        }
        updateOtherPlayers(state);
    });
    
    room.onMessage("anlatıcı", (msg) => {
        document.getElementById("chat").innerHTML = `💬 Anlatıcı: ${msg.mesaj}`;
    });
    
    // Hareket kontrolleri
    const joystick = nipplejs.create({ zone: document.getElementById("joyistik"), mode: "static", lockY: true });
    joystick.on("move", (evt, nipple) => {
        const angle = nipple.angle.radian;
        const force = Math.min(1, nipple.force || 0);
        const dx = Math.cos(angle) * force * 0.2;
        const dz = Math.sin(angle) * force * 0.2;
        room.send("hareket", { dx, dz });
    });
    joystick.on("end", () => {
        room.send("hareket", { dx: 0, dz: 0 });
    });
    
    // Saldırı butonu – en yakın oyuncuyu bul
    document.getElementById("attack").onclick = () => {
        let closest = null;
        let minDist = 5;
        for(let [id, mesh] of otherPlayers.entries()) {
            const dist = playerMesh.position.distanceTo(mesh.position);
            if(dist < minDist) {
                minDist = dist;
                closest = id;
            }
        }
        if(closest) {
            room.send("vurus", closest);
        } else {
            document.getElementById("chat").innerHTML = "💬 Yakında kimse yok, havaya saldırdın!";
        }
    };
}

// Kendi konumunu her kare sunucuya gönder (opsiyonel)
function animate() {
    requestAnimationFrame(animate);
    if(room && playerMesh) {
        // yerel hareketi yapma, çünkü sunucu yetkili – ama görsel için sunucudan gelen konumu al
        const me = room.state?.oyuncular[room.sessionId];
        if(me) {
            playerMesh.position.set(me.x, 0, me.z);
            camera.position.x = me.x;
            camera.position.z = me.z + 8;
            camera.lookAt(playerMesh.position);
        }
    }
    renderer.render(scene, camera);
}
animate();

joinGame();
