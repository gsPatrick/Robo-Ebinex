# Primeiro, certifique-se de que o pacote 'pynput' esteja instalado no seu ambiente Python.
# Você pode instalar o pynput executando o seguinte comando no terminal ou prompt de comando:
# pip install pynput

# O 'pynput' é uma biblioteca que permite controlar e monitorar o mouse e o teclado em Python.
# Então, para rodar o código corretamente, você precisa garantir que o Python esteja instalado no seu sistema.

# Se você não tiver o Python instalado, pode fazer o download da versão mais recente em:
# https://www.python.org/downloads/

# Além disso, o código simula interações humanas com o mouse e teclado, então verifique se a execução do código está
# em um contexto onde o uso do mouse e teclado simulados é permitido, como em um ambiente de desktop.

from pynput.mouse import Controller, Button
from pynput.keyboard import Controller as KeyboardController, Key
import random
import time

# Inicializando os controladores do mouse e teclado
mouse = Controller()
keyboard = KeyboardController()

# Função para simular um clique com um pequeno atraso aleatório
def click_mouse():
    mouse.click(Button.left)  # Clica com o botão esquerdo onde o mouse estiver
    time.sleep(random.uniform(0.1, 0.3))  # Atraso aleatório entre os cliques para simular um comportamento humano

# Função para apagar o texto (simulando a tecla backspace)
def erase_text():
    for _ in range(20):  # Apaga 20 caracteres (ajuste conforme necessário)
        keyboard.press(Key.backspace)
        keyboard.release(Key.backspace)
        time.sleep(random.uniform(0.05, 0.1))  # Atraso aleatório para simular um comportamento mais humano

# Função para digitar o número 800
def type_800():
    keyboard.type('800')
    time.sleep(random.uniform(0.1, 0.3))  # Atraso aleatório para simular digitação natural

# Aguardar 5 segundos antes de começar

# Registrar o tempo de início
start_time = time.time()

# Realizar o clique
click_mouse()

# Apagar o texto atual
erase_text()

# Digitar o número 800
type_800()

# Registrar o tempo de fim
end_time = time.time()

# Calcular o tempo decorrido
elapsed_time = end_time - start_time

# Exibir o tempo total no terminal
print(f"Tempo para clique, apagar e digitar 800: {elapsed_time:.2f} segundos")
