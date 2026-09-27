import sys, os
if getattr(sys, 'frozen', False):
    os.chdir(sys._MEIPASS)
    try:
        import pgzero.loaders
        pgzero.loaders.set_root(sys._MEIPASS)
    except Exception:
        pass

os.environ["SDL_VIDEO_CENTERED"] = "1"
import pgzrun , random , ctypes , pygame
from platform import system as systam
from pgzero.builtins import *    
from pgzero.screen import Screen 
screen: Screen 

def make_titlebar_black():
    try:
        # получаем HWND (идентификатор окна в Windows)
        hwnd = pygame.display.get_wm_info().get('window')
        if not hwnd:
            return
        # 1. включаем темный режим шапки (Win 10/11)
        ctypes.windll.dwmapi.DwmSetWindowAttribute(
            hwnd, 20, ctypes.byref(ctypes.c_int(1)), 4
        )
        # 2. для Windows 11 красим саму плашку в чистый чёрный цвет                                   <3
        ctypes.windll.dwmapi.DwmSetWindowAttribute(
            hwnd, 35, ctypes.byref(ctypes.c_int(0x00000000)), 4
        )
        # 3. текст заголовка делаем белым
        ctypes.windll.dwmapi.DwmSetWindowAttribute(
            hwnd, 36, ctypes.byref(ctypes.c_int(0x00FFFFFF)), 4
        )
    except Exception:
        pass

if systam() == "Windows":
    titlebar_done = False
else:
    titlebar_done = True


# Настройки окна
WIDTH = 800
HEIGHT = 600
TITLE = "Story Clicker"
FPS = 60

# Игровые переменные
score             = 0
mode              = "menu"
volume            = 80
difficulty        = "Средняя"
load_progress     = 0.0
shop_open         = False
shop_x            = -320
music_volume      = 30

# Объекты
fon                  = Actor("fon")
fon_lvl_2            = Actor("fon_level2")
fon_menu             = Actor("fon_menu")
loading_bgs          = [Actor("loading_1"), Actor("loading_2"), Actor("loading_3")]
current_bg           = loading_bgs[0]
settings_fon         = Actor("settings_fon")
library_fon          = Actor("library_fon")
# vol_minus         = Actor("vol_minus", (310, 240))
# vol_plus          = Actor("vol_plus", (490, 240))
# diff_easy            = Actor("diff_easy", (240, 370))
# diff_normal          = Actor("diff_normal", (400, 370))
# diff_hard            = Actor("diff_hard", (560, 370))
# back_button          = Actor("back_button", (WIDTH // 2, 480))
play_button          = Actor("play_button", (WIDTH // 2, 250))
settings_button      = Actor("settings_button", (WIDTH // 2, 370))
library_button       = Actor("library_button", (WIDTH // 2, 490))
shop_tab             = Actor("shop_tab", (WIDTH // 2, HEIGHT - 50))
shop_panel           = Actor("shop_panel", (WIDTH // 2, HEIGHT - 200))
settings_btn_small   = Actor("settings_btn_small", (WIDTH - 40, 40))
btn_upg_dmg          = Actor("btn_buy", (-150, 145))
btn_upg_gold         = Actor("btn_buy", (-150, 255))
btn_upg_poison       = Actor("btn_buy", (-150, 365))
btn_upg_mine         = Actor("btn_buy", (-150, 475))

battle_button = Actor("battle_button", (WIDTH // 2, 475))

sfx_minus            = Actor("vol_minus", (290, 180))
sfx_minus            = Actor("vol_minus", (290, 180))
sfx_plus             = Actor("vol_plus",  (510, 180))
mus_minus            = Actor("vol_minus", (290, 260))
mus_plus             = Actor("vol_plus",  (510, 260))
back_button          = Actor("back_button", (WIDTH // 2, 490))
diff_easy            = Actor("diff_easy",   (240, 395))
diff_normal          = Actor("diff_normal", (400, 395))
diff_hard            = Actor("diff_hard",   (560, 395))

#in-game variables
diff_mult = 1.0
gold                 = 0
click_damage         = 1
enemy_max_hp         = int(100 * diff_mult)
enemy_hp             = enemy_max_hp
enemy_name           = "Slime"
gold_given_per_click = 0.5

#upgrades

upg_dmg_lvl = 0
upg_dmg_cost = 20

upg_gold_lvl = 0
upg_gold_cost = 35

upg_poison_lvl = 0
upg_poison_cost = 50
passive_dps = 0

upg_mine_lvl = 0
upg_mine_cost = 40
passive_gold = 0

passive_timer = 0.0

current_level = 1


story_timer = 0.0

# enemy 
enemy                = Actor("enemy_slime", (WIDTH // 2 + 60, HEIGHT // 2 + 10))
# enemy_lvl_2          = Actor("enemy_knight")



hints = [
    "Совет: кликай быстрее, чтобы разбудить спящую силу.",
    "Совет: древние порталы хранят секреты павших королей.",
    "Совет: каждый босс требует особого терпения.",
    "Совет: не забывай прокачивать силу удара в лавке."
]
current_hint = ""



# Отрисовка
def draw():
    if mode == "menu":
        #menu
        fon_menu.draw()
        screen.draw.text("STORY CLICKER", center=(WIDTH // 2, 130), fontsize=56, color=(255, 230, 120), gcolor=(180, 110, 20), owidth=1.5, ocolor=(20, 10, 5), shadow=(3, 3), scolor="black")
        #DEMO
        screen.draw.text("DEMO", center=(590, 105), fontsize=24, color=(255, 60, 60), owidth=1.5, ocolor="black", angle=12)
        play_button.draw()
        settings_button.draw()
        library_button.draw()
    elif mode == "loading":
        #loading screen
        current_bg.draw()
        screen.draw.text("ЗАГРУЗКА...", center=(WIDTH // 2, HEIGHT - 75), fontsize=32, color="gold", owidth=1.5, ocolor="black")
        screen.draw.text(current_hint, center=(WIDTH // 2, HEIGHT - 35), fontsize=22, color="white", owidth=1.2, ocolor="black")
        screen.draw.rect(Rect(200, 480, 400, 16), "gold")
        screen.draw.filled_rect(Rect(202, 482, 396 * load_progress, 12), (80, 200, 255))   #loading on react by gemini <3 (не шарю в rect)
    elif mode == "prologue":
        #prologue screen
        settings_fon.draw()
        screen.draw.text("ПАДЕНИЕ АРКАНУМА", center=(WIDTH // 2, 110), fontsize=36, color="gold", owidth=1.5, ocolor="black")
        
        story_lines = [
            "Великое королевство Арканум пало жертвой «Изумрудной Чумы» —",
            "алхимического паразита, обратившего всех жителей в мутантов.",
            "",
            "Ты — последний Странник из древнего Ордена Очищения.",
            "В твоих руках зачарованный клинок, способный рассекать скверну.",
            "",
            "Твоя цель — пробиться через катакомбы к Главному Реактору.",
            "На опушке леса дорогу преграждает первое порождение чумы..."
        ]
        visible_lines = min(len(story_lines), int(story_timer / 0.6) + 1)
        y_text = 175
        for line in story_lines[:visible_lines]:
            screen.draw.text(line, center=(WIDTH // 2, y_text), fontsize=18, color=(240, 230, 210), owidth=1, ocolor="black")
            y_text += 30
        if visible_lines >= len(story_lines):
            battle_button.draw()


    elif mode == "game":
        #game lol
        if current_level == 1:
            fon.draw()
        else:
            fon_lvl_2.draw()

        screen.draw.text(f"ЗОЛОТО: {int(gold)}", topright=(WIDTH - 70, 20), fontsize=26, color="gold", owidth=1.2, ocolor="black")
        screen.draw.text(f"УРОН: {click_damage}", topleft=(30, 20), fontsize=24, color="white", owidth=1.2, ocolor="black")
        enemy.draw()
        screen.draw.text(enemy_name, center=(enemy.x, enemy.y - 125), fontsize=22, color="gold", owidth=1.2, ocolor="black")
        screen.draw.text(f"HP: {enemy_hp} / {enemy_max_hp}", center=(enemy.x, enemy.y - 100), fontsize=24, color="crimson", owidth=1.2, ocolor="black") 

        # screen.draw.text(f"Счёт: {score}", center=(WIDTH // 2, 50), fontsize=36, color="white")
        shop_tab.draw()
        shop_panel.draw()
        settings_btn_small.draw()

                # Рисуем карточки в магазине, когда шторка открывается
        if shop_x > -300:
            screen.draw.text("УЛУЧШЕНИЯ", center=(shop_x + 150, 40), fontsize=26, color="gold", owidth=1.2, ocolor="black")
            
            # 1. Урон
            screen.draw.text(f"Острота клинка (Ур. {upg_dmg_lvl})", center=(shop_x + 150, 85), fontsize=17, color="white", owidth=1, ocolor="black")
            screen.draw.text("+5 к урону от клика", center=(shop_x + 150, 108), fontsize=13, color="gray", owidth=1, ocolor="black")
            btn_upg_dmg.draw()
            screen.draw.text(f"Купить: {upg_dmg_cost}G", center=(btn_upg_dmg.x, btn_upg_dmg.y), fontsize=16, color="gold", owidth=1, ocolor="black")

            # 2. Золото за клик (лимит 2)
            screen.draw.text(f"Золотые пальцы ({upg_gold_lvl}/2)", center=(shop_x + 150, 195), fontsize=17, color="white", owidth=1, ocolor="black")
            screen.draw.text("+0.5G за клик", center=(shop_x + 150, 218), fontsize=13, color="gray", owidth=1, ocolor="black")
            btn_upg_gold.draw()
            if upg_gold_lvl < 2:
                screen.draw.text(f"Купить: {upg_gold_cost}G", center=(btn_upg_gold.x, btn_upg_gold.y), fontsize=16, color="gold", owidth=1, ocolor="black")
            else:
                screen.draw.text("[МАКСИМУМ]", center=(btn_upg_gold.x, btn_upg_gold.y), fontsize=15, color="gray", owidth=1, ocolor="black")

            # 3. Пассивный яд
            screen.draw.text(f"Скверный яд (Ур. {upg_poison_lvl})", center=(shop_x + 150, 305), fontsize=17, color="white", owidth=1, ocolor="black")
            screen.draw.text(f"+2 урона/сек (сейчас: {passive_dps})", center=(shop_x + 150, 328), fontsize=13, color="gray", owidth=1, ocolor="black")
            btn_upg_poison.draw()
            screen.draw.text(f"Купить: {upg_poison_cost}G", center=(btn_upg_poison.x, btn_upg_poison.y), fontsize=16, color="gold", owidth=1, ocolor="black")

            # 4. Монетница
            screen.draw.text(f"Монетница (Ур. {upg_mine_lvl})", center=(shop_x + 150, 415), fontsize=17, color="white", owidth=1, ocolor="black")
            screen.draw.text(f"+1G/сек (сейчас: {passive_gold})", center=(shop_x + 150, 438), fontsize=13, color="gray", owidth=1, ocolor="black")
            btn_upg_mine.draw()
            screen.draw.text(f"Купить: {upg_mine_cost}G", center=(btn_upg_mine.x, btn_upg_mine.y), fontsize=16, color="gold", owidth=1, ocolor="black")
        
    elif mode == "settings":
        #settings window
        settings_fon.draw()
        screen.draw.text("НАСТРОЙКИ", center=(WIDTH // 2, 105), fontsize=46, color="gold", owidth=1.5, ocolor="black")
        # эфекты
        sfx_minus.draw()
        screen.draw.text(f"ЗВУКИ: {volume}%", center=(400, 180), fontsize=24, color="white", owidth=1.2, ocolor="black")
        sfx_plus.draw()
        # музыка
        mus_minus.draw()
        screen.draw.text(f"МУЗЫКА: {music_volume}%", center=(400, 260), fontsize=24, color="white", owidth=1.2, ocolor="black")
        mus_plus.draw()
        #difficulty
        screen.draw.text(f"СЛОЖНОСТЬ: {difficulty.upper()}", center=(WIDTH // 2, 335), fontsize=22, color="gold", owidth=1, ocolor="black")
        diff_easy.draw()
        diff_normal.draw()
        diff_hard.draw()

        back_button.draw()
    elif mode == "settings1":
        #settings window
        settings_fon.draw()
        screen.draw.text("НАСТРОЙКИ", center=(WIDTH // 2, 105), fontsize=46, color="gold", owidth=1.5, ocolor="black")
        # эфекты
        sfx_minus.draw()
        screen.draw.text(f"ЗВУКИ: {volume}%", center=(400, 180), fontsize=24, color="white", owidth=1.2, ocolor="black")
        sfx_plus.draw()
        # музыка
        mus_minus.draw()
        screen.draw.text(f"МУЗЫКА: {music_volume}%", center=(400, 260), fontsize=24, color="white", owidth=1.2, ocolor="black")
        mus_plus.draw()
        #difficulty
        screen.draw.text(f"СЛОЖНОСТЬ: {difficulty.upper()}", center=(WIDTH // 2, 335), fontsize=22, color="gold", owidth=1, ocolor="black")
        diff_easy.draw()
        diff_normal.draw()
        diff_hard.draw()

        back_button.draw()
    elif mode == "library":
        #library window
        library_fon.draw()
        back_button.draw()
        screen.draw.text("coming soon...", center=(WIDTH // 2, HEIGHT // 2), fontsize=36, color="white", owidth=1.5, ocolor="black")
        screen.draw.text("будет в финальной версии игры", center=(WIDTH // 2, HEIGHT // 1.8), fontsize=36, color="red", owidth=1.5, ocolor="black")
    elif mode == 'victory':
        settings_fon.draw()
        screen.draw.text("ДЕМО ПРОЙДЕНО!", center=(WIDTH // 2, 140), fontsize=42, color="gold", owidth=1.5, ocolor="black")
        screen.draw.text("Сир Мордред пал. Врата Катакомб распахнуты!", center=(WIDTH // 2, 220), fontsize=20, color="white", owidth=1.2, ocolor="black")
        screen.draw.text(f"Собрано золота: {int(gold)}", center=(WIDTH // 2, 290), fontsize=24, color="gold", owidth=1.2, ocolor="black")
        screen.draw.text("Продолжение следует...", center=(WIDTH // 2, 350), fontsize=20, color="gray", owidth=1, ocolor="black")
        back_button.draw()

#useless function to finish loading screen and go to game mode
def finish_loading():
    global mode , story_timer
    story_timer = 0.0
    mode = "prologue"


def update(dt):
    global titlebar_done , load_progress , shop_x , shop_open , story_timer , passive_timer, gold, enemy_hp
    if not titlebar_done:
        make_titlebar_black()
        titlebar_done = True
    if mode == "loading":
        load_progress = min(1.0, load_progress + dt * 0.4)
    target_x = 0 if shop_open else -320
    shop_x += (target_x - shop_x) * 12 * dt
    shop_panel.topleft = (shop_x, 0)
    shop_tab.topleft = (shop_x + 316, 260)
    sounds.click1.set_volume(volume / 100)
    sounds.click.set_volume(volume / 100)
    sounds.hit.set_volume(volume / 100)
    music.set_volume(music_volume / 100)
    if mode == "prologue":
        story_timer += dt
    btn_upg_dmg.x    = shop_x + 150
    btn_upg_gold.x   = shop_x + 150
    btn_upg_poison.x = shop_x + 150
    btn_upg_mine.x   = shop_x + 150
    if mode == "game":
        passive_timer += dt
        if passive_timer >= 1.0:
            passive_timer = 0.0
            gold += passive_gold
            if enemy_hp > 0 and passive_dps > 0:
                enemy_hp = max(0, enemy_hp - passive_dps)
    # if enemy_hp <= 0:
    #     enemy_hp = enemy_max_hp

#mouse!!!
def on_mouse_down(button, pos):
    global mode , current_bg , current_hint , volume , difficulty , shop_open , music_volume , enemy_hp , gold , click_damage , story_timer , diff_mult , enemy_max_hp , upg_dmg_lvl, upg_dmg_cost, upg_gold_lvl, upg_gold_cost, upg_poison_lvl, upg_poison_cost, passive_dps, upg_mine_lvl, upg_mine_cost, passive_gold, gold_given_per_click, enemy_max_hp , current_level, enemy_name
    if mode == "menu":
        #menu here
        if play_button.collidepoint(pos):
            sounds.click1.play()
            current_bg = random.choice(loading_bgs)
            current_hint = random.choice(hints)
            mode = "loading"
            clock.schedule(finish_loading, 3.0)            #timer loading (default 3 seconds maybe)
        elif settings_button.collidepoint(pos):
            sounds.click1.play()
            mode = "settings"
        elif library_button.collidepoint(pos):
            sounds.click1.play()
            mode = "library"
    elif mode == "settings":
        # Звуки
        if sfx_minus.collidepoint(pos):
            sounds.click1.play()
            volume = max(0, volume - 5)
        elif sfx_plus.collidepoint(pos):
            sounds.click1.play()
            volume = min(100, volume + 5)
        # Музыка
        elif mus_minus.collidepoint(pos):
            sounds.click1.play()
            music_volume = max(0, music_volume - 5)
            music.set_volume(music_volume / 100)
        elif mus_plus.collidepoint(pos):
            sounds.click1.play()
            music_volume = min(100, music_volume + 5)
            music.set_volume(music_volume / 100)
        # Сложность
        elif diff_easy.collidepoint(pos):
            sounds.click1.play()
            difficulty = "Лёгкая"
            diff_mult = 0.5
        elif diff_normal.collidepoint(pos):
            sounds.click1.play()
            difficulty = "Средняя"
            diff_mult = 1
        elif diff_hard.collidepoint(pos):
            sounds.click1.play()
            difficulty = "Сложная"
            diff_mult = 2
        # Назад в главное меню
        elif back_button.collidepoint(pos):
            sounds.click1.play()
            mode = "menu"
    elif mode == "settings1":
        # Звуки
        if sfx_minus.collidepoint(pos):
            sounds.click1.play()
            volume = max(0, volume - 5)
        elif sfx_plus.collidepoint(pos):
            sounds.click1.play()
            volume = min(100, volume + 5)
        # Музыка
        elif mus_minus.collidepoint(pos):
            sounds.click1.play()
            music_volume = max(0, music_volume - 5)
            music.set_volume(music_volume / 100)
        elif mus_plus.collidepoint(pos):
            sounds.click1.play()
            music_volume = min(100, music_volume + 5)
            music.set_volume(music_volume / 100)
        # Сложность
        elif diff_easy.collidepoint(pos):
            sounds.click1.play()
            difficulty = "Лёгкая"
            diff_mult = 0.5
        elif diff_normal.collidepoint(pos):
            sounds.click1.play()
            difficulty = "Средняя"
            diff_mult = 1
        elif diff_hard.collidepoint(pos):
            sounds.click1.play()
            difficulty = "Сложная"
            diff_mult = 2
        # Назад обратно в игру
        elif back_button.collidepoint(pos):
            sounds.click1.play()
            mode = "game"
    elif mode == "library":
        #library here
        if back_button.collidepoint(pos):
            sounds.click1.play()
            mode = "menu"
    elif mode == "game":
        #game here
        if shop_tab.collidepoint(pos):
            shop_open = not shop_open
            sounds.click.play()
        elif shop_panel.collidepoint(pos):
            # sounds.click.play()
            pass
        elif settings_btn_small.collidepoint(pos):
            sounds.click1.play()
            mode = "settings1"
        elif enemy.collidepoint(pos):
            if enemy_hp > 0:
                sounds.hit.play()
                enemy_hp = max(0, enemy_hp - click_damage)
                gold += gold_given_per_click

            if enemy_hp <= 0:
                sounds.coin.play()
                if current_level == 1:
                    gold += 50
                    current_level = 2
                    enemy.image = "enemy_knight"
                    enemy_name = "Sir Morped"
                    enemy.pos = (405, 360)
                    enemy_max_hp = int(300 * diff_mult)
                    enemy_hp = enemy_max_hp
                elif current_level == 2:
                    gold += 150
                    mode = "victory"
                    

                #кнопки улучшений
        if shop_open and btn_upg_dmg.collidepoint(pos):
            if gold >= upg_dmg_cost:
                sounds.upgrade.play()
                gold -= upg_dmg_cost
                upg_dmg_lvl += 1
                click_damage += 1
                upg_dmg_cost = int(upg_dmg_cost * 1.5)
        elif shop_open and btn_upg_gold.collidepoint(pos):
            if upg_gold_lvl < 2 and gold >= upg_gold_cost:
                sounds.upgrade.play()
                gold -= upg_gold_cost
                upg_gold_lvl += 1
                gold_given_per_click += 0.5
                upg_gold_cost = int(upg_gold_cost * 2.0)
        elif shop_open and btn_upg_poison.collidepoint(pos):
            if gold >= upg_poison_cost:
                sounds.upgrade.play()
                gold -= upg_poison_cost
                upg_poison_lvl += 1
                passive_dps += 2
                upg_poison_cost = int(upg_poison_cost * 1.6)
        elif shop_open and btn_upg_mine.collidepoint(pos):
            if gold >= upg_mine_cost:
                sounds.upgrade.play()
                gold -= upg_mine_cost
                upg_mine_lvl += 1
                passive_gold += 1
                upg_mine_cost = int(upg_mine_cost * 1.6)

    elif mode == "prologue":
        if story_timer < 5.0:
            story_timer = 5.0

        elif battle_button.collidepoint(pos):
            sounds.click1.play()
            mode = "game"
            current_level = 1
            enemy.image = "enemy_slime"
            enemy_name = "Slime"
            enemy.pos = (WIDTH // 2 + 60, HEIGHT // 2 + 10)
            enemy_max_hp = int(100 * diff_mult)
            enemy_hp = enemy_max_hp
    elif mode == "victory":
        if back_button.collidepoint(pos):
            sounds.click1.play()
            mode = "menu"


            
                
            
            



"""
⡆⣿⣿⣦⠹⣳⣳⣕⢅⠈⢗⢕⢕⢕⢕⢕⢈⢆⠟⠋⠉⠁⠉⠉⠁⠈⠼⢐⢕
⡗⢰⣶⣶⣦⣝⢝⢕⢕⠅⡆⢕⢕⢕⢕⢕⣴⠏⣠⡶⠛⡉⡉⡛⢶⣦⡀⠐⣕
⡝⡄⢻⢟⣿⣿⣷⣕⣕⣅⣿⣔⣕⣵⣵⣿⣿⢠⣿⢠⣮⡈⣌⠨⠅⠹⣷⡀⢱
⡝⡵⠟⠈⢀⣀⣀⡀⠉⢿⣿⣿⣿⣿⣿⣿⣿⣼⣿⢈⡋⠴⢿⡟⣡⡇⣿⡇⡀
⡝⠁⣠⣾⠟⡉⡉⡉⠻⣦⣻⣿⣿⣿⣿⣿⣿⣿⣿⣧⠸⣿⣦⣥⣿⡇⡿⣰⢗
⠁⢰⣿⡏⣴⣌⠈⣌⠡⠈⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣬⣉⣉⣁⣄⢖⢕⢕
⡀⢻⣿⡇⢙⠁⠴⢿⡟⣡⡆⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣵⣵
⡻⣄⣻⣿⣌⠘⢿⣷⣥⣿⠇⣿⣿⣿⣿⣿⣿⠛⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣷⢄⠻⣿⣟⠿⠦⠍⠉⣡⣾⣿⣿⣿⣿⣿⣿⢸⣿⣦⠙⣿⣿⣿⣿⣿⣿⣿⣿
⡕⡑⣑⣈⣻⢗⢟⢞⢝⣻⣿⣿⣿⣿⣿⣿⣿⠸⣿⠿⠃⣿⣿⣿⣿⣿⣿⡿⠁

"""


# def on_key_down(key):


pygame.mixer.init()
music.play("fon_music_1")               # music <3
pgzrun.go()