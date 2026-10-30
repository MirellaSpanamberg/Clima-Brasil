
// ======================================
// CLIMA BRASIL - JAVASCRIPT
// ======================================

// Elementos do HTML
const estadoSelect = document.getElementById("state-select");
const buscaCidade = document.getElementById("city-search");
const sugestoes = document.getElementById("city-suggestions");
const mensagem = document.getElementById("search-message");

const cidadeClima = document.getElementById("weather-city");
const estadoClima = document.getElementById("weather-state");
const temperatura = document.getElementById("weather-temperature");
const sensacao = document.getElementById("feels-like");
const umidade = document.getElementById("humidity");
const vento = document.getElementById("wind-speed");
const chuva = document.getElementById("rain-chance");
const dataClima = document.getElementById("weather-date");
const descricao = document.getElementById("weather-description");
const iconeClima = document.getElementById("weather-icon");
const previsao = document.getElementById("forecast-container");

// Lista de cidades
let todasCidades = [];

// ======================================
// CARREGAR ESTADOS E CIDADES
// ======================================

async function carregarLocalidades() {
    try {
        mensagem.textContent = "Carregando estados e cidades...";

        const respostaEstados = await fetch(
            "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome"
        );

        const estados = await respostaEstados.json();

        estados.forEach(estado => {
            const opcao = document.createElement("option");

            opcao.value = estado.sigla;
            opcao.textContent = estado.nome;

            estadoSelect.appendChild(opcao);
        });

        const respostaCidades = await fetch(
            "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome"
        );

        const cidades = await respostaCidades.json();

        todasCidades = cidades.map(cidade => {
            const uf = cidade.microrregiao?.mesorregiao?.UF;

            return {
                nome: cidade.nome,
                uf: uf?.sigla || "",
                estado: uf?.nome || ""
            };
        }).filter(cidade => cidade.uf);

        mensagem.textContent = "Selecione um estado ou pesquise uma cidade.";

    } catch (erro) {
        mensagem.textContent = "Erro ao carregar estados e cidades.";
        console.error(erro);
    }
}

// ======================================
// PESQUISAR CIDADES
// ======================================

function pesquisarCidades() {
    const texto = buscaCidade.value.toLowerCase().trim();
    const ufSelecionada = estadoSelect.value;

    sugestoes.innerHTML = "";

    if (texto.length < 2) {
        sugestoes.classList.remove("ativa");
        return;
    }

    let resultado = todasCidades.filter(cidade => {
        const nomeCorresponde = cidade.nome.toLowerCase().includes(texto);
        const estadoCorresponde = !ufSelecionada || cidade.uf === ufSelecionada;

        return nomeCorresponde && estadoCorresponde;
    });

    resultado = resultado.slice(0, 10);

    if (resultado.length === 0) {
        sugestoes.innerHTML = "<div class='suggestion-item'>Nenhuma cidade encontrada.</div>";
        sugestoes.classList.add("ativa");
        return;
    }

    resultado.forEach(cidade => {
        const item = document.createElement("div");

        item.className = "suggestion-item";
        item.textContent = `${cidade.nome} - ${cidade.uf}`;

        item.addEventListener("click", () => {
            buscaCidade.value = cidade.nome;
            sugestoes.classList.remove("ativa");

            buscarClima(cidade);
        });

        sugestoes.appendChild(item);
    });

    sugestoes.classList.add("ativa");
}

// ======================================
// BUSCAR CLIMA
// ======================================

async function buscarClima(cidade) {
    try {
        mensagem.textContent = "Buscando informações do clima...";

        const busca = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade.nome)}&count=20&language=pt&format=json&countryCode=BR`
        );

        const dadosBusca = await busca.json();

        const local = dadosBusca.results?.find(resultado =>
            resultado.country_code === "BR" &&
            resultado.admin1 === cidade.estado
        );

        if (!local) {
            mensagem.textContent = "Não foi possível localizar essa cidade.";
            return;
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${local.latitude}&longitude=${local.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=5&timezone=auto`;

        const resposta = await fetch(url);
        const dados = await resposta.json();

        mostrarClima(dados, cidade);

        mensagem.textContent = "Clima atualizado com sucesso!";

    } catch (erro) {
        mensagem.textContent = "Erro ao consultar o clima.";
        console.error(erro);
    }
}

// ======================================
// DESCRIÇÃO DO TEMPO
// ======================================

function interpretarClima(codigo) {
    if (codigo === 0) return ["Céu limpo", "fa-sun"];
    if (codigo <= 2) return ["Parcialmente nublado", "fa-cloud-sun"];
    if (codigo === 3) return ["Nublado", "fa-cloud"];
    if (codigo <= 48) return ["Neblina", "fa-smog"];
    if (codigo <= 57) return ["Garoa", "fa-cloud-rain"];
    if (codigo <= 67) return ["Chuva", "fa-cloud-showers-heavy"];
    if (codigo <= 77) return ["Neve", "fa-snowflake"];
    if (codigo <= 82) return ["Pancadas de chuva", "fa-cloud-showers-heavy"];
    if (codigo <= 86) return ["Neve intensa", "fa-snowflake"];

    return ["Trovoadas", "fa-cloud-bolt"];
}

// ======================================
// MOSTRAR CLIMA NA TELA
// ======================================

function mostrarClima(dados, cidade) {
    const atual = dados.current;
    const diario = dados.daily;

    const clima = interpretarClima(atual.weather_code);

    cidadeClima.textContent = cidade.nome;
    estadoClima.textContent = cidade.estado;

    temperatura.textContent = `${Math.round(atual.temperature_2m)}°C`;
    sensacao.textContent = `${Math.round(atual.apparent_temperature)}°C`;
    umidade.textContent = `${atual.relative_humidity_2m}%`;
    vento.textContent = `${atual.wind_speed_10m} km/h`;
    chuva.textContent = `${diario.precipitation_probability_max[0]}%`;

    descricao.textContent = clima[0];
    iconeClima.className = `fa-solid ${clima[1]}`;

    dataClima.textContent = new Date(atual.time).toLocaleDateString("pt-BR");

    mostrarPrevisao(diario);
    criarGrafico(dados.hourly);
}

// ======================================
// PREVISÃO DOS PRÓXIMOS DIAS
// ======================================

function mostrarPrevisao(dados) {
    previsao.innerHTML = "";

    dados.time.forEach((dia, indice) => {
        const clima = interpretarClima(dados.weather_code[indice]);

        const data = new Date(`${dia}T12:00:00`).toLocaleDateString(
            "pt-BR",
            { weekday: "short", day: "2-digit" }
        );

        const card = document.createElement("div");
        card.className = "forecast-card";

        card.innerHTML = `
            <p>${data}</p>
            <i class="fa-solid ${clima[1]}"></i>
            <strong>${Math.round(dados.temperature_2m_max[indice])}°C</strong>
            <span>${Math.round(dados.temperature_2m_min[indice])}°C</span>
            <small>Chuva: ${dados.precipitation_probability_max[indice]}%</small>
        `;

        previsao.appendChild(card);
    });
}

// ======================================
// GRÁFICO DE TEMPERATURA
// ======================================

function criarGrafico(dados) {
    const elemento = document.querySelector("#temperature-chart");

    if (window.graficoClima) {
        window.graficoClima.destroy();
    }

    const horarios = dados.time.slice(0, 24).map(hora =>
        hora.substring(11, 16)
    );

    const temperaturas = dados.temperature_2m.slice(0, 24);

    const configuracao = {
        chart: {
            type: "area",
            height: 300,
            toolbar: { show: false }
        },
        series: [{
            name: "Temperatura",
            data: temperaturas
        }],
        xaxis: {
            categories: horarios
        },
        yaxis: {
            title: { text: "Temperatura (°C)" }
        },
        stroke: {
            curve: "smooth"
        },
        dataLabels: {
            enabled: false
        }
    };

    window.graficoClima = new ApexCharts(elemento, configuracao);
    window.graficoClima.render();
}

// ======================================
// EVENTOS DE PESQUISA
// ======================================

buscaCidade.addEventListener("input", pesquisarCidades);

estadoSelect.addEventListener("change", () => {
    pesquisarCidades();
});

// Fechar sugestões ao clicar fora
document.addEventListener("click", evento => {
    if (!buscaCidade.contains(evento.target) &&
        !sugestoes.contains(evento.target)) {
        sugestoes.classList.remove("ativa");
    }
});

// ======================================
// MODO ESCURO
// ======================================

const botaoTema = document.getElementById("theme-toggle");
const iconeTema = botaoTema.querySelector("i");

function atualizarTema() {
    const escuro = document.body.classList.contains("dark");

    iconeTema.className = escuro
        ? "fa-solid fa-sun"
        : "fa-solid fa-moon";
}

if (localStorage.getItem("temaClima") === "dark") {
    document.body.classList.add("dark");
}

atualizarTema();

botaoTema.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const tema = document.body.classList.contains("dark")
        ? "dark"
        : "light";

    localStorage.setItem("temaClima", tema);

    atualizarTema();
});

// ======================================
// INICIAR DASHBOARD
// ======================================

carregarLocalidades();