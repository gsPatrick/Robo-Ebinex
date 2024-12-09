// Primeiro instalar as Dependencias utilizando = npm install ou npm i
// Para rodar o codigo basta digitar no console node Ebinex.js
// Apos isso use uma ferramenta de desenvolvimento como o Postman Insomnia ou o Bruno e incie o robo como end point abaixo
// http://localhost:3000/start
// Ou abra a URL acima no navegador e o bot vai incializar
//Para fechar o bot basta fechar a aba do Ebinex que vai ser aberta


const express = require('express');
const app = express();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { exec } = require('child_process'); // Módulo para executar comandos no sistema

// Adiciona o plugin stealth para evitar detecção
puppeteer.use(StealthPlugin());

class EbinexTradingBot {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isRunning = false;
        this.isProcessingMartingale = false; // Nova flag para controlar o fluxo
        this.historico = [];
        this.martingaleStep = 0;
        this.MetaValorPositivo = 0;
        this.MetaValorNegativo = 0;
    }

    async initialize() {
        try {
            const chromeExecutablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
            this.browser = await puppeteer.launch({
                headless: false,
                executablePath: chromeExecutablePath,
                defaultViewport: null,
                args: [
                    '--start-maximized',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-infobars',
                    '--window-position=0,0',
                    '--ignore-certificate-errors',
                    '--ignore-certificate-errors-spki-list',
                    `--user-data-dir=${process.env.USERPROFILE}\\AppData\\Local\\Google\\Chrome\\User Data`
                ]
            });

            const pages = await this.browser.pages();
            this.page = pages.find(page => page.url().includes('ebinex.com'));

            if (!this.page) {
                this.page = pages[0];
                await this.page.goto('https://ebinex.com/traderoom', {
                    waitUntil: 'networkidle0',
                    timeout: 60000
                });
            }

            console.log('Bot initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
            throw error;
        }
    }

    // Método para rodar um script Python
    runPythonScript(scriptName) {
        return new Promise((resolve, reject) => {
            exec(`python ${scriptName}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    reject(error);
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                    reject(stderr);
                }
                console.log(`stdout: ${stdout}`);
                resolve(stdout);
            });
        });
    }

    async processarItem8() {
        try {
            // Evita iniciar novo processo enquanto outro Martingale está rodando
            if (this.isProcessingMartingale) {
                console.log('Martingale em andamento. Aguardando finalização.');
                return;
            }

            const tempoElement = await this.page.$('.MuiTypography-root.MuiTypography-body2.css-hb1hc7');
            if (!tempoElement) {
                console.log('Elemento de tempo não encontrado.');
                return;
            }

            const tempoText = await this.page.evaluate(el => el.innerHTML, tempoElement);
            const match = tempoText.match(/(\d{2}):(\d{2})/);
            if (!match) {
                console.log('Não foi possível encontrar o formato de tempo.');
                return;
            }

            const segundos = parseInt(match[2], 10);
            if (segundos !== 10) {
                console.log(`O tempo não está em 8 segundos, está em ${segundos}s.`);
                return;
            }

            // Verifica o iframe
            const iframe = await this.page.$('iframe');
            if (!iframe) {
                console.log('Iframe não encontrado!');
                return;
            }

            const iframeDocument = await iframe.contentFrame();
            if (!iframeDocument) {
                console.log('Não foi possível acessar o documento do iframe!');
                return;
            }

            let items = await iframeDocument.$$('.valueItem-l31H9iuA');
            let item8 = items[7]; // O item 8 está no índice 7

            if (!item8) {
                console.log('Item 8 não encontrado!');
                return;
            }

            let valorAtual = await item8.$eval('.valueValue-l31H9iuA', el => el.textContent.trim());
            let processedValue = valorAtual && valorAtual !== '∅' ? valorAtual : 'Sem valor';

            if (processedValue === 'Sem valor') {
                console.log('Valor inválido encontrado no item 8.');
                return;
            }

            // Atualiza o histórico com o valor atual
            if (this.historico.length === 0 || this.historico[this.historico.length - 1] !== processedValue) {
                this.historico = [processedValue];
                console.log('Histórico atualizado:', this.historico);
                this.realizarAcoes(processedValue); // Executa a lógica de ações
            }

            console.log(`Valor atual para ações: ${valorAtual}`);

            // Iniciar Martingale se o valor for válido
            await this.realizarAcoes(valorAtual);

        } catch (error) {
            console.error('Erro ao processar item 8:', error);
        }
    }
    
// Função para obter o sufixo (primeiro caractere)

async sufixoValorAtual(valorAtual) {
    try {
        // Remove espaços em branco
        valorAtual = valorAtual.trim();
        // Retorna apenas o primeiro caractere
        return valorAtual[0];
    } catch (error) {
        console.error('Erro ao obter sufixo:', error);
        return ''; // Retorna string vazia em caso de erro
    }
}

// Função para extrair apenas o número absoluto (sem sinal ou porcentagem)
async valorAbsoluto(valorAtual) {
    try {
        // Remove espaços em branco
        valorAtual = valorAtual.trim();
        // Expressão regular para capturar o número absoluto
        const match = valorAtual.match(/[+-]?(\d+(\.\d+)?)/);
        if (match) {
            return match[1]; // Retorna apenas o valor numérico como string
        }
        console.log('Nenhum valor numérico encontrado.');
        return ''; // Retorna string vazia se não encontrar um número
    } catch (error) {
        console.error('Erro ao extrair valor absoluto:', error);
        return ''; // Retorna string vazia em caso de erro
    }
}

async obterValorAtual() {
    try {
        // Verifica o iframe
        const iframe = await this.page.$('iframe');
        if (!iframe) {
            console.log('Iframe não encontrado!');
            return 'Sem valor'; // Retorna um valor padrão caso o iframe não seja encontrado
        }

        const iframeDocument = await iframe.contentFrame();
        if (!iframeDocument) {
            console.log('Não foi possível acessar o documento do iframe!');
            return 'Sem valor'; // Retorna um valor padrão caso o documento do iframe não seja acessível
        }

        // Coleta todos os itens no iframe
        let items = await iframeDocument.$$('.valueItem-l31H9iuA');
        let item8 = items[7]; // O item 8 está no índice 7

        if (!item8) {
            console.log('Item 8 não encontrado!');
            return 'Sem valor'; // Retorna um valor padrão caso o item 8 não seja encontrado
        }

        // Tenta obter o texto do item8 e trata caso esteja vazio
        let valorAtual = await item8.$eval('.valueValue-l31H9iuA', el => el.textContent?.trim() || 'Sem valor');
        
        return valorAtual;
    } catch (error) {
        console.error('Erro ao obter valor atual:', error);
        return 'Sem valor'; // Retorna um valor padrão caso ocorra um erro
    }
}


    
async realizarAcoes(valorAtual) {
    if (this.isProcessingMartingale) return; // Evita sobreposição de fluxos
    let tempoValido = false;
    let continueLoop = true; 

    this.isProcessingMartingale = true; // Inicia o controle do fluxo

    try {
        let sufixoAtual = await this.sufixoValorAtual(valorAtual); // Usando a função correta
        let valorAbsoluto = await this.valorAbsoluto(valorAtual);
        let valorAbsolutoNumero = parseFloat(valorAbsoluto);

        // Ação para valor positivo (se >= 1.74)
        if (sufixoAtual === '+' && valorAbsolutoNumero >= this.MetaValorPositivo) {
            const botaoInicialPositivo = 'Bear';
            console.log(`Iniciando Martingale para valor positivo: ${valorAtual}`);
            await this.runPythonScript('martingale1.py');
            console.log('Martingale1 positivo');
            await this.clicarBotao(botaoInicialPositivo);

            const botaoVender = 'Bear';
            let count = 2;

            while (count <= 4 && continueLoop) { 
                // Verifica o sufixo antes de continuar
                tempoValido = false; // Redefinir no início de cada iteração
                valorAtual = await this.obterValorAtual();
                sufixoAtual = await this.sufixoValorAtual(valorAtual);
                console.log(`Testando, o valor atual é ${valorAtual} o sufixo atual é ${sufixoAtual}`);
                
                if (sufixoAtual !== '+') {
                    console.log('Sufixo mudou, liberando para o próximo loop.');
                    continueLoop = false; // Sai do loop
                    break;
                }

                // Aguarda o tempo válido de 8 segundos
                while (!tempoValido) {
                    tempoValido = await this.verificarTempo();
                    if (!tempoValido) {
                        console.log('Esperando tempo válido de 8 segundos...');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                // Se o tempo for válido, executa o Martingale
                if (tempoValido) {
                    console.log(`Executando Martingale ${count} - Martingale positivo`);
                    await this.runPythonScript(`martingale${count}.py`);
                    console.log('Martingale positivo');
                    await this.clicarBotao(botaoVender);
                    count++;
                }
            }
            
        } else if ((sufixoAtual === '-' || sufixoAtual === '−') && valorAbsolutoNumero >= this.MetaValorNegativo) { 
            const botaoInicialNegativo = 'Bull';
            console.log(`Iniciando Martingale para valor negativo: ${valorAtual}`);
            await this.runPythonScript('martingale1.py');
            console.log('Martingale1 negativo');""
            await this.clicarBotao(botaoInicialNegativo);

            const botaoComprar = 'Bull';
            let count = 2;

            while (count <= 4 && continueLoop) {
                    tempoValido = false; // Redefinir no início de cada iteração
                // Verifica o sufixo antes de continuar
                valorAtual = await this.obterValorAtual();
                sufixoAtual = await this.sufixoValorAtual(valorAtual);
                console.log(`Testando, o valor atual é ${valorAtual} o sufixo atual é ${sufixoAtual}`);

                if (sufixoAtual !== '-' && sufixoAtual !== '−') {
                    console.log('Sufixo mudou, liberando para o próximo loop.');
                    continueLoop = false; // Sai do loop
                    break;
                }

                // Aguarda o tempo válido de 8 segundos
                while (!tempoValido) {
                    tempoValido = await this.verificarTempo();
                    if (!tempoValido) {
                        console.log('Esperando tempo válido de 8 segundos...');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                // Se o tempo for válido, executa o Martingale
                if (tempoValido) {
                    console.log(`Executando Martingale ${count} - Martingale negativo`);
                    await this.runPythonScript(`martingale${count}.py`);
                    console.log('Martingale negativo');
                    await this.clicarBotao(botaoComprar);
                    count++;
                }
            }
            
        } else {
            console.log('Valor atual não corresponde a nenhum padrão esperado.');
        }
    } catch (error) {
        console.error('Erro ao realizar ações:', error);
    } finally {
        this.isProcessingMartingale = false; // Libera para próximo loop
    }
}

 

    async clicarBotao(botao) {
        const sucesso = await this.page.evaluate((texto) => {
            const button = Array.from(document.querySelectorAll('button')).find(button => {
                const pTag = button.querySelector('p');
                return pTag && pTag.textContent.trim() === texto; // Utilize 'texto' aqui
            });
    
            if (button) {
                button.click();
                console.log(`Clicando no botão ${texto}...`);
                return true;
            }
            return false;
        }, botao);  // Passe o parâmetro 'botao' aqui
    
        if (!sucesso) {
            console.log(`Botão com texto "${botao}" não encontrado.`);
        }
    }
    

    async verificarTempo() {
        // Captura o elemento de tempo
        const tempoElemento = await this.page.$('.MuiTypography-root.MuiTypography-body2.css-hb1hc7');
        
        // Verifica se o elemento foi encontrado
        if (!tempoElemento) {
            console.log("Elemento de tempo não encontrado.");
            return false;  // Retorna falso se o elemento não foi encontrado
        }
    
        // Se o elemento for encontrado, tenta capturar o texto
        const tempoTexto = await this.page.evaluate(el => el.innerHTML, tempoElemento);
    
        // Realiza a correspondência para extrair o tempo (minutos:segundos)
        const match = tempoTexto.match(/(\d{2}):(\d{2})/);
        
        // Se o tempo for encontrado e os segundos forem 10, retorna verdadeiro
        if (match) {
            const segundos = parseInt(match[2], 10);
            return segundos === 10;
        }
    
        // Retorna falso caso o formato do tempo não seja válido
        return false;
    }
    

    

    resetMartingale() {
        this.martingaleStep = 0;
        this.expectedSufixo = null;
        this.currentFlow = null;
    }


    startTimer() {
        if (!this.isRunning) {
            this.isRunning = true;
            setInterval(() => this.processarItem8(), 1000);
            // setInterval(() => this.atualizarItem(), 1000)
        }
    }

    async stop() {
        if (this.browser) {
            await this.browser.close();
            this.isRunning = false;
            console.log('Bot stopped');
        }
    }
}

const bot = new EbinexTradingBot();
const PORT = 3000;

app.get('/start', async (req, res) => {
    try {
        await bot.initialize();
        bot.startTimer();
        res.json({ status: 'Bot started successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/stop', async (req, res) => {
    try {
        await bot.stop();
        res.json({ status: 'Bot stopped successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
