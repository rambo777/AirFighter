var clamp = function(x, min, max) {
    return x < min ? min : (x > max ? max : x);
}
var Q = Quintus()
    .include("Sprites, Anim, Input, Touch, Scenes, UI")
    .setup({
        width: 1024,
        height: 910,
        scaleToFit: true
    })
    .touch();
Q.input.touchControls({
    controls: [
        ['left', '<'],
        ['right', '>'],
        [],
        [],
        [],
        ['fire', 'sp']
    ]
});
Q.controls();

Q.Sprite.extend("Player", {
    init: function(p) {
        this._super(p, {
            sprite: "player",
            sheet: "player",
            x: Q.el.width / 2,
            y: Q.el.height - 320,
            type: Q.SPRITE_FRIENDLY,
            speed: 10
        });
        this.add("animation");
        this.play("default");
        this.add("Gun");
        this.on("hit", function(col) {
            //   console.log("collide  shot = " + col.obj.p.type);
            if ((col.obj.isA("AlienShot") && ((col.obj.p.type & Q.SPRITE_ENEMY) == Q.SPRITE_ENEMY))) {
                //     console.log("collide ##");
                this.destroy();
                col.obj.destroy();
                var explosion = Q.stage().insert(new Q.Explosion({ x: col.obj.p.x, y: col.obj.p.y, type: Q.SPRITE_NONE }));
                Q.stageScene("endGame", 1, { label: "Ops You Died !! " });

            }
        });
    },
    step: function(dt) {
        if (Q.inputs['left'])
            this.p.x -= this.p.speed;
        if (Q.inputs['right'])
            this.p.x += this.p.speed;
        this.p.x = clamp(this.p.x, 0 + (this.p.w / 2), Q.el.width - (this.p.w / 2));
        // this.fire();
        this.stage.collide(this);

    }
});
Q.Sprite.extend("Alien", {
    init: function(p) {
        this._super(p, {
            sprite: "alien",
            sheet: "alien",
            x: Q.el.width / 2,
            speed: 200
        });
        this.p.y = this.p.h - 50;
        this.add("animation");
        this.play("default");
        this.add("BasicAI");
        var counter = 0;
        this.on("hit", function(col) {
            if ((col.obj.isA("Shot") && ((col.obj.p.type & Q.SPRITE_FRIENDLY) == Q.SPRITE_FRIENDLY))) {
                setTimeout(function() {
                    counter += 0.5;
                }, 1000);

                console.log("counter = " + counter);
                if (counter >= 10) {
                    this.destroy();
                    Q.stageScene("endGame", 1, { label: "You Won !! " });
                }
                col.obj.destroy();
                var explosion = Q.stage().insert(new Q.Explosion({ x: col.obj.p.x, y: col.obj.p.y, type: Q.SPRITE_NONE }));

            }
        });
    },
    step: function(dt) {
        this.stage.collide(this);
    }
});
Q.Sprite.extend("Shot", {
    init: function(p) {
        this._super(p, {
            sprite: "shot",
            sheet: "shot",
            speed: 200
        });
        this.add("animation");
        this.play("default");
        this.on("hit", function(col) {
            if ((col.obj.isA("AlienShot") && ((col.obj.p.type & Q.SPRITE_ENEMY) == Q.SPRITE_ENEMY))) {
                this.destroy();
                col.obj.destroy();
                var explosion = Q.stage().insert(new Q.Explosion({ x: col.obj.p.x, y: col.obj.p.y, type: Q.SPRITE_DEFAULT | Q.SPRITE_NONE }));
            }
        });
    },
    step: function(dt) {
        this.stage.collide(this);
        this.p.y -= this.p.speed * dt;
        if (this.p.y > Q.el.height || this.p.y < 0) {
            this.destroy();
        }
    }
});
Q.Sprite.extend("AlienShot", {
    init: function(p) {
        this._super(p, {
            sprite: "alienShot",
            sheet: "alienShot",
            speed: 200
        });
        this.add("animation");
        this.play("default");
    },
    step: function(dt) {
        this.p.y -= this.p.speed * dt;
        if (this.p.y > Q.el.height || this.p.y < 0) {
            this.destroy();
        }
    }
});
Q.Sprite.extend("Explosion", {
    init: function(p) {
        this._super(p, {
            sprite: "explosion",
            sheet: "explosion",
            speed: "2"
        });
        this.add("animation");
        this.play("default");
    },
    step: function(dt) {
        var explosion = this;
        setTimeout(function() {
            explosion.destroy();
            console.log("explode");
        }, 500);
        console.log("explodeDisappear");

    }
})
Q.component("Gun", {
    added: function() {
        this.entity.p.shots = [];
        this.entity.p.canFire = true;
        this.entity.on("step", "handleFiring");
    },
    extend: {
        handleFiring: function(dt) {
            var entity = this;
            for (var i = entity.p.shots.length - 1; i >= 0; i--) {
                if (entity.p.shots[i].isDestroyed) {
                    entity.p.shots.splice(i, 1);
                    // console.log("removed shot");
                }
            }
            if (Q.inputs['fire'] && entity.p.type == Q.SPRITE_FRIENDLY) {
                //      console.log(entity.p.shots);
                entity.fire(Q.SPRITE_FRIENDLY);
            }
        },
        fire: function(type) {
            var entity = this;
            var timeout = 0;
            if (!entity.p.canFire) return;
            var shot;
            if (type == Q.SPRITE_FRIENDLY) {
                shot = Q.stage().insert(new Q.Shot({ x: entity.p.x, y: entity.p.y - 50, speed: 200, type: Q.SPRITE_DEFAULT | Q.SPRITE_FRIENDLY }));
                timeout = 500;
            } else {
                shot = Q.stage().insert(new Q.AlienShot({ x: entity.p.x, y: entity.p.y + entity.p.h - 50, speed: -200, type: Q.SPRITE_DEFAULT | Q.SPRITE_ENEMY }));
                timeout = 200
            }
            entity.p.shots.push(shot);
            entity.p.canFire = false;
            setTimeout(function() {
                entity.p.canFire = true;
            }, timeout);
        }
    }
});
Q.component("BasicAI", {
    added: function() {
        this.entity.changeDirection();
        this.entity.on("step", "move");
        this.entity.on("step", "tryToFire");
        this.entity.add("Gun");
    },
    extend: {
        changeDirection: function() {
            var entity = this;
            var numberOfSeconds = Math.floor((Math.random() * 5) + 1);
            setTimeout(function() {
                entity.p.speed = -entity.p.speed;
                entity.changeDirection();
            }, numberOfSeconds * 1000);

        },
        move: function(dt) {
            var entity = this;
            entity.p.x -= entity.p.speed * dt;
            if (entity.p.x > Q.el.width - (entity.p.w / 2) || entity.p.x < 0 + (entity.p.w / 2)) {
                entity.p.speed = -entity.p.speed;
            }
        },
        tryToFire: function() {
            var entity = this;
            var player = Q("Player").first();
            if (!player) return;
            if (player.p.x + player.p.w > entity.p.x && player.p.x - player.p.w < entity.p.x) {
                this.fire(Q.SPRITE_ENEMY);
            }
        }
    }

});
Q.scene("mainLevel", function(stage) {
    Q.gravity = 0;
    stage.insert(new Q.Sprite({ asset: "Space.png", x: Q.el.width / 2, y: Q.el.height / 2, type: Q.SPRITE_NONE }));
    stage.insert(new Q.Player());
    stage.insert(new Q.Alien());

});
Q.scene("endGame", function(stage) {
    var container = stage.insert(new Q.UI.Container({
        x: Q.width / 2,
        y: Q.height / 2,
        fill: "#ffffff"
    }));
    var button = container.insert(new Q.UI.Button({
        x: 0,
        y: 0,
        fill: "#cccccc",
        label: "Play Again !!"
    }));
    container.insert(new Q.UI.Text({
        x: 10,
        y: -10 - button.p.h,
        label: stage.options.label
    }));
    button.on("click", function() {
        Q.clearStages();
        Q.stageScene("mainLevel");
    });
    container.fit(20);
})
Q.load(["Space.png", "PlaneSprite.png", "ShotSprite.png", "AlienSprite.png", "AlienShotSprite.png", "ExplosionSprite.png",
    "player.json", "shot.json", "alien.json", "alienShot.json", "explosion.json"
], function() {
    Q.compileSheets("PlaneSprite.png", "player.json");
    Q.compileSheets("ShotSprite.png", "shot.json");
    Q.compileSheets("AlienShotSprite.png", "alienShot.json");
    Q.compileSheets("AlienSprite.png", "alien.json");
    Q.compileSheets("ExplosionSprite.png", "explosion.json");
    Q.animations("player", { default: { frames: [0, 1, 2, 3], rate: 1 / 4 } });
    Q.animations("shot", { default: { frames: [0, 1, 2], rate: 1 / 3 } });
    Q.animations("alienShot", { default: { frames: [0, 1, 2], rate: 1 / 3 } });
    Q.animations("alien", { default: { frames: [0, 1, 2, 3], rate: 1 / 4 } });
    Q.animations("explosion", { default: { frames: [0, 1, 2, 3, 4], rate: 1 / 4 } });
    Q.stageScene("mainLevel");
    console.log("sheets and animations loaded !!");

});