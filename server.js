import express from 'express';
import { Server } from 'colyseus';
import { createServer } from 'http';
import { monitor } from '@colyseus/monitor';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import { Schema, type, MapSchema } from '@colyseus/schema';
import { Room } from 'colyseus';

dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = createServer(app);
const gameServer = new Server({ server });

class Oyuncu extends Schema {
  @type("string") id = "";
  @type("string") isim = "";
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") can = 100;
  @type("string") tasTipi = "piyon";   // piyon, at, fil, kale, vezir, kral
  @type("number") takim = 0;
}

class OyunDurumu extends Schema {
  @type({ map: Oyuncu }) oyuncular = new MapSchema();
  @type("number") zaman = 0;
}

class SatrancOdası extends Room {
  onCreate(options) {
    this.setState(new OyunDurumu());
    this.maxClients = 100;

    this.onMessage("hareket", (client, data) => {
      const oyuncu = this.state.oyuncular.get(client.sessionId);
      if (oyuncu) {
        oyuncu.x += data.dx || 0;
        oyuncu.z += data.dz || 0;
      }
    });

    this.onMessage("vurus", async (client, hedefId) => {
      const saldiran = this.state.oyuncular.get(client.sessionId);
      const hedef = this.state.oyuncular.get(hedefId);
      if (saldiran && hedef) {
        let hasar = 10;
        if (saldiran.tasTipi === "vezir") hasar = 30;
        if (saldiran.tasTipi === "kral") hasar = 50;
        hedef.can -= hasar;

        const yorum = await groq.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: `Oyuncu ${saldiran.isim} (${saldiran.tasTipi}) adlı oyuncuya ${hasar} hasar vurdu. Küfürbaz bir yorum yap.` }],
          temperature: 0.9,
          max_tokens: 60
        });
        this.broadcast("anlatıcı", { mesaj: yorum.choices[0].message.content });

        if (hedef.can <= 0) {
          this.state.oyuncular.delete(hedefId);
          this.broadcast("oyuncu_oldü", { id: hedefId });
        }
      }
    });
  }

  onJoin(client, options) {
    const yeniOyuncu = new Oyuncu();
    yeniOyuncu.id = client.sessionId;
    yeniOyuncu.isim = options.isim || "İsimsiz";
    yeniOyuncu.tasTipi = options.tasTipi || "piyon";
    yeniOyuncu.can = this.tasCan(yeniOyuncu.tasTipi);
    yeniOyuncu.x = Math.random() * 100 - 50;
    yeniOyuncu.z = Math.random() * 100 - 50;
    yeniOyuncu.takim = options.takim || 0;
    this.state.oyuncular.set(client.sessionId, yeniOyuncu);
  }

  onLeave(client) {
    this.state.oyuncular.delete(client.sessionId);
  }

  tasCan(tip) {
    switch(tip) {
      case "piyon": return 100;
      case "at": case "fil": case "kale": return 200;
      case "vezir": return 300;
      case "kral": return 500;
      default: return 100;
    }
  }
}

gameServer.define("satranc", SatrancOdası);
app.use("/colyseus", monitor());

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Sunucu çalışıyor: http://localhost:${PORT}`));
