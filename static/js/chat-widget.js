// MATYLA DESIGN ASSISTANT — premium widget (final, validated edition)
document.addEventListener('DOMContentLoaded', () => {

    // --- Ustawienia API ---
    // UWAGA: Zmień to na publiczny adres URL Twojego wdrożonego serwera Flask, jeśli jest wdrożony
    const FLASK_API_CHAT_URL = '/chat'; 
    // UWAGA: Zmień to na endpoint swojej wtyczki WordPress (jeśli jest inny)
    const WP_LEAD_ENDPOINT = '/wp-json/matyla/v1/save-lead'; 

    const bubble = document.createElement('button');
    bubble.className = 'chat-bubble';
    bubble.setAttribute('aria-label', 'Otwórz czat');
    bubble.textContent = 'M';

    const win = document.createElement('section');
    win.className = 'chat-window';
    win.innerHTML = `
        <header class="chat-header">
            <div class="chat-title">Matyla Design Assistant</div>
            <button class="chat-close" aria-label="Zamknij">✕</button>
        </header>

        <div class="chat-messages" id="msgs">
            <div id="typingIndicatorRow" class="msg-row" style="display: none;">
                <div class="msg-avatar">M</div>
                <div class="typing-bubble">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            </div>

            <div class="msg-row">
                <div class="msg-avatar">M</div>
                <div class="msg bot">
                    Cześć!<br> Jestem <strong>Matyla Design Assistant</strong>.<br><br>
                    
                    Moja rola polega na zebraniu kluczowych informacji, aby nasz zespół mógł przygotować dedykowaną ofertę na podstawie naszej rozmowy.<br><br>
                    W czym mogę Ci dzisiaj pomóc? 
                </div>
            </div>
            </div>

        <div class="chat-input-area-wrapper">
            <div class="chat-input" id="chatInputArea">
                <input id="chatInput" type="text" placeholder="Napisz wiadomość…" inputmode="text" autocomplete="off">
                <button id="sendBtn">Wyślij</button>
            </div>
            
            <form class="chat-consent-form" id="consentForm" style="display: none;">
                <div class="form-title">Wypełnij dane do wyceny:</div>
                <input type="text" id="consentName" placeholder="Imię i Nazwisko" required>
                <input type="email" id="consentEmail" placeholder="Adres E-mail" required>
                <input type="tel" id="consentPhone" placeholder="Numer telefonu (opcjonalnie)">
                
                <label class="consent-checkbox-container" style="font-size: 0.75em; line-height: 1.4; display: block;">
                    <input type="checkbox" id="consentCheckbox" required>
                    <span class="checkmark"></span>
                   Podając dane kontaktowe wyrażasz zgodę na ich przetwarzanie przez Matyla Design w celu odpowiedzi na Twoje pytanie.<br>
                   Administratorem danych jest Matyla Design. Więcej informacji znajdziesz w naszej <a href="https://matyladesign.pl/polityka-prywatnosci" target="_blank" style="color: white; font-weight: bold; text-decoration: underline;">Polityce Prywatności</a>.
                </label>

                <button type="submit" id="consentSubmitBtn">Wyślij dane do zespołu</button>
            </form>
        </div>
    `;

    document.body.appendChild(bubble);
    document.body.appendChild(win);

    const closeBtn = win.querySelector('.chat-close');
    const msgs = win.querySelector('#msgs');
    const input = win.querySelector('#chatInput');
    const sendBtn = win.querySelector('#sendBtn');
    const typingIndicatorRow = win.querySelector('#typingIndicatorRow');
    
    // Elementy kontrolne
    const chatInputArea = win.querySelector('#chatInputArea');
    const consentForm = win.querySelector('#consentForm');
    const consentCheckbox = win.querySelector('#consentCheckbox');


    const open = () => { win.classList.add('active'); input.focus(); };
    const close = () => { win.classList.remove('active'); };
    bubble.addEventListener('click', open);
    closeBtn.addEventListener('click', close);

    const scrollToEnd = () => msgs.scrollTo({ top: msgs.scrollHeight, behavior: 'smooth' });

    // --- efekt pisania (zachowany) ---
    async function typeText(target, text) {
        const delay = (ms) => new Promise(res => setTimeout(res, ms));
        for (let i = 0; i < text.length; i++) {
            target.innerHTML += text[i];
            scrollToEnd();
            const c = text[i];
            let speed = 18;
            if (/[.,!?]/.test(c)) speed = 120;
            if (c === " ") speed = 10;
            await delay(speed);
        }
    }

    // --- Dodaj wiadomość (bot lub user) ---
    async function appendMessage(rawText, sender) {
        const isBot = sender === 'bot';
        const row = document.createElement('div');
        row.className = 'msg-row';

        const msg = document.createElement('div');
        msg.className = `msg ${sender}`;
        msg.style.opacity = '0';
        msg.style.transition = 'opacity .45s ease';

        // Usuwamy tag [CONSENT] i towarzyszący mu tekst instrukcji dla formularza
        const cleanText = rawText.replace(/\[CONSENT\]/g, '').replace(/Formularz pozwoli Ci wpisać imię i nazwisko, adres e-mail oraz numer telefonu \(opcjonalnie\)\. Po jego wysłaniu dane trafią bezpośrednio do naszego zespołu\./g, '').trim();


        if (isBot) {
            const av = document.createElement('div');
            av.className = 'msg-avatar';
            av.textContent = 'M';
            row.appendChild(av);
            row.appendChild(msg);
        } else {
            row.style.justifyContent = 'flex-end';
            row.appendChild(msg);
        }

        msgs.appendChild(row);
        scrollToEnd();
        setTimeout(() => { msg.style.opacity = '1'; }, 50);

        if (isBot) {
            // podział na akapity (\n\n)
            const parts = cleanText.split(/\n\s*\n/).filter(p => p.trim());
            for (const part of parts) {
                const p = document.createElement('p');
                msg.appendChild(p);
                await typeText(p, part);
                await new Promise(r => setTimeout(r, 400)); // pauza między akapitami
            }
        } else {
            msg.textContent = cleanText;
        }
        
        // Zwracamy oryginalny tekst (zawierający [CONSENT]), aby obsłużyć przełączanie
        return rawText; 
    }

    // --- Główna funkcja wysyłania ---
    function send() {
        const userText = input.value.trim();
        if (!userText) return;

        appendMessage(userText, 'user');
        input.value = '';
        input.disabled = true; // Zablokuj input w trakcie oczekiwania

        // Pokaż typing indicator
        msgs.appendChild(typingIndicatorRow);
        typingIndicatorRow.style.display = 'flex';
        scrollToEnd();

        fetch(FLASK_API_CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText })
        })
        .then(res => res.json())
        .then(async data => {
            input.disabled = false; // Odblokuj input
            typingIndicatorRow.style.display = 'none';
            if (msgs.contains(typingIndicatorRow)) msgs.removeChild(typingIndicatorRow);
            
            const rawResponse = data.response || data.reply || "Brak odpowiedzi.";
            
            // Czekamy, aż wiadomość bota zostanie w pełni "napisana"
            const writtenResponse = await appendMessage(rawResponse, 'bot'); 
            scrollToEnd();
            
            // Logika WYKRYWANIA TAGU [CONSENT] i przełączania interfejsu
            if (writtenResponse.includes('[CONSENT]')) {
                // Ukrywamy standardowy input i pokazujemy formularz
                chatInputArea.style.display = 'none'; 
                consentForm.style.display = 'flex';   
                
                // Ustaw focus na pierwsze pole
                setTimeout(() => { consentForm.querySelector('#consentName').focus(); }, 100); 
            }
        })
        .catch(err => {
            input.disabled = false; // Odblokuj input po błędzie
            console.error('Błąd komunikacji z serwerem Flask:', err);
            typingIndicatorRow.style.display = 'none';
            if (msgs.contains(typingIndicatorRow)) msgs.removeChild(typingIndicatorRow);
            appendMessage("Wystąpił błąd komunikacji. Spróbuj ponownie.", 'bot');
        });
    }

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    
    // --- Obsługa wysłania formularza kontaktowego ---
    consentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Walidacja checkboxa
        if (!consentCheckbox.checked) {
            alert("Aby kontynuować, musisz wyrazić zgodę na kontakt.");
            return;
        }
        
        const name = document.getElementById('consentName').value;
        const email = document.getElementById('consentEmail').value;
        const phone = document.getElementById('consentPhone').value;
        
        // Zbieranie danych i przygotowanie wiadomości dla AI
        const summary = `
            Klient wyraził zgodę i wysłał dane: Imię: ${name}, Email: ${email}, Telefon: ${phone || 'Brak'}.
            PROŚBA O WYSŁANIE FINALNEJ WIADOMOŚCI KOŃCZĄCEJ ROZMOWĘ I DZIĘKOWANIE (Zgodnie z SYSTEM PROMPT).
        `.trim();
        
        // Ukryj formularz
        consentForm.style.display = 'none';
        
        // Pokaż typing indicator 
        msgs.appendChild(typingIndicatorRow);
        typingIndicatorRow.style.display = 'flex';
        scrollToEnd();
        
        // 1. Wysyłamy zebrane dane jako ostatnią wiadomość użytkownika do AI
        fetch(FLASK_API_CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: summary })
        })
        .then(res => res.json())
        .then(async data => {
            typingIndicatorRow.style.display = 'none';
            if (msgs.contains(typingIndicatorRow)) msgs.removeChild(typingIndicatorRow);
            
            const rawResponse = data.response || data.reply || "Dziękujemy za kontakt!";
            const fullHistory = data.history; 

            // 2. Wysyłamy pełne dane leada (z historią) do endpointu WordPress PHP
            if (fullHistory) {
                const leadData = {
                    name: name,
                    email: email,
                    phone: phone || 'Brak',
                    chat_history: fullHistory, 
                    timestamp: new Date().toISOString()
                };

                fetch(WP_LEAD_ENDPOINT, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(leadData)
                })
                .then(wpRes => {
                    if (!wpRes.ok) {
                        console.error("Błąd zapisu leada do WP:", wpRes.statusText);
                    } else {
                        console.log("Dane leada pomyślnie wysłane do wtyczki WP.");
                    }
                })
                .catch(wpErr => {
                    console.error("Błąd komunikacji z endpointem WP:", wpErr);
                });
            } else {
                console.warn("Brak historii konwersacji w odpowiedzi serwera Python. Wysyłanie do WP pominięte.");
            }

            // 3. Wyświetlamy końcową wiadomość AI
            await appendMessage(rawResponse, 'bot');
            scrollToEnd();
            
            // Zablokowanie głównego pola input po zakończeniu rozmowy
            chatInputArea.style.display = 'none'; 
        })
        .catch(err => {
            console.error('Błąd wysyłania formularza:', err);
            typingIndicatorRow.style.display = 'none';
            if (msgs.contains(typingIndicatorRow)) msgs.removeChild(typingIndicatorRow);
            appendMessage("Wystąpił błąd podczas wysyłania danych. Spróbuj ponownie. Przywracam pole do wiadomości.", 'bot');
            
            // Przywracamy możliwość kontynuacji rozmowy
            chatInputArea.style.display = 'flex'; 
        });
    });
});