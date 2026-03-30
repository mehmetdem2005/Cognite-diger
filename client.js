// ========== İSTEMCİ TARAFLI 3D MODEL FONKSİYONLARI ==========

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

// ========== OYUNA KATILMA ==========

function joinGame(room, scene) {
    room.onStateChange((state) => {
        // Oyuncu durumu güncellendiğinde yapılacaklar buraya gelir
    });

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
}
