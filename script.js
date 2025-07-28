const suits = ['♥', '♠', '♦', '♣'];
const ranks = ['9', '10', 'J', 'Q', 'K', 'A'];

// 48 kartlık deste (her karttan iki tane)
function createDeck() {
    let deck = [];
    for (let d = 0; d < 2; d++) { // iki deste
        for (let suit of suits) {
            for (let rank of ranks) {
                deck.push({ suit, rank });
            }
        }
    }
    return deck;
}

// Deste karıştırma (Fisher-Yates)
function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// 4 oyuncuya 4'erli gruplar halinde 12'şer kart dağıt
function dealCards(deck) {
    const players = [[], [], [], []];
    let cardIndex = 0;
    for (let round = 0; round < 3; round++) { // 3 turda 4'er kart
        for (let p = 0; p < 4; p++) {
            for (let k = 0; k < 4; k++) {
                players[p].push(deck[cardIndex++]);
            }
        }
    }
    return players;
}

// Kart büyüklük sırası (A > 10 > K > Q > J > 9)
const rankOrder = ['A', '10', 'K', 'Q', 'J', '9'];
const suitOrder = ['♥', '♠', '♦', '♣'];
const suitClass = {
    '♥': 'hearts',
    '♦': 'diamonds',
    '♠': 'spades',
    '♣': 'clubs',
};

function sortPlayerCards(cards) {
    // Önce suit'e göre, sonra rankOrder'a göre sırala
    return cards.slice().sort((a, b) => {
        const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
        if (suitDiff !== 0) return suitDiff;
        return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
    });
}

function renderPlayers(players) {
    for (let i = 0; i < 4; i++) {
        const cardsDiv = document.querySelector(`#player${i+1} .cards`);
        cardsDiv.innerHTML = '';
        // Her suit için bir satır
        for (const suit of suitOrder) {
            const rowDiv = document.createElement('div');
            rowDiv.style.marginBottom = '2px';
            const suitCards = sortPlayerCards(players[i]).filter(card => card.suit === suit);
            suitCards.forEach(card => {
                const cardDiv = document.createElement('span');
                cardDiv.className = 'card ' + suitClass[card.suit];
                cardDiv.textContent = card.rank + card.suit;
                rowDiv.appendChild(cardDiv);
            });
            cardsDiv.appendChild(rowDiv);
        }
    }
}

// İhale değişkenleri
let auctionActive = false;
let auctionPlayers = [0, 1, 2, 3]; // Oyuncu indexleri
let auctionBids = [null, null, null, null];
let auctionPasses = [false, false, false, false];
let auctionCurrent = 0;
let auctionHighestBid = 0;
let auctionWinner = null;
let auctionTurns = 0;
let trumpSuit = null;

// Samandağ Pinaki özel değişkenleri
let sordumKonusMode = false; // Sordum/Konuş modunda mı?
let sordumPlayer = null; // Sordum diyen oyuncu
let konusPlayer = null; // Konuş diyen oyuncu

function updateAuctionHighestBid() {
    const div = document.getElementById('auction-highest-bid');
    if (auctionHighestBid && auctionHighestBid >= 150) {
        div.textContent = `En Yüksek Teklif: ${auctionHighestBid}`;
    } else {
        div.textContent = '';
    }
}

function startAuction() {
    auctionActive = true;
    auctionBids = [null, null, null, null];
    auctionPasses = [false, false, false, false];
    auctionCurrent = 0;
    auctionHighestBid = 150; // İhale en az 150'den başlar
    auctionWinner = null;
    auctionTurns = 0;
    // Koz seçimini sıfırla
    trumpSuit = null;
    // Samandağ Pinaki değişkenlerini sıfırla
    sordumKonusMode = false;
    sordumPlayer = null;
    konusPlayer = null;
    document.getElementById('auction-status').textContent = 'İhale başladı! (En az 150)';
    document.getElementById('auction-controls').style.display = '';
    updateAuctionHighestBid();
    nextAuctionTurn();
}

function nextAuctionTurn() {
    // Sordum/Konuş modunda değilse normal ihale bitiş kontrolü yap
    if (!sordumKonusMode && auctionTurns >= 4) {
        // İhale bittiğinde tüm kutulardan kaldır
        for (let i = 0; i < 4; i++) {
            document.getElementById(`player${i+1}`).classList.remove('auction-active');
        }

        endAuction();
        return;
    }
    // Sıradaki oyuncu
    document.getElementById('auction-player').textContent = `Oyuncu ${auctionCurrent + 1} sırada: `;
    document.getElementById('bid-input').value = '';
    document.getElementById('bid-input').focus();
    // Tüm kutulardan kaldır, sadece teklif sırası gelen oyuncuya ekle
    for (let i = 0; i < 4; i++) {
        const div = document.getElementById(`player${i+1}`);
        if (i === auctionCurrent) div.classList.add('auction-active');
        else div.classList.remove('auction-active');
    }
    
    // Samandağ Pinaki kuralı: Buton görünürlüğünü yönet
    const sordumBtn = document.getElementById('sordum-btn');
    const konusBtn = document.getElementById('konus-btn');
    const bozBtn = document.getElementById('boz-btn');
    const bidBtn = document.getElementById('bid-btn');
    const passBtn = document.getElementById('pass-btn');
    
    // Tüm butonları gizle
    sordumBtn.style.display = 'none';
    konusBtn.style.display = 'none';
    bozBtn.style.display = 'none';
    bidBtn.style.display = 'inline-block';
    passBtn.style.display = 'inline-block';
    
    if (sordumKonusMode) {
        // Sordum/Konuş modunda
        if (auctionCurrent === 3 && sordumPlayer === 2 && auctionBids[2] === null) {
            // 4. oyuncu sırasında ve 3. oyuncu sordum demiş, 3. oyuncu henüz teklif vermemiş
            bozBtn.style.display = 'inline-block';
            konusBtn.style.display = 'inline-block';
            bidBtn.style.display = 'none';
            passBtn.style.display = 'none';
        } else if (auctionCurrent === 3 && sordumPlayer === 2 && auctionBids[2] !== null) {
            // 4. oyuncu sırasında ve 3. oyuncu teklif vermiş, 4. oyuncu teklif verebilir veya pas diyebilir
            bidBtn.style.display = 'inline-block';
            passBtn.style.display = 'inline-block';
        } else if (auctionCurrent === 2 && konusPlayer === 3) {
            // 3. oyuncu sırasında ve 4. oyuncu konuş demiş
            bidBtn.style.display = 'inline-block';
            passBtn.style.display = 'inline-block';
        }
    } else if (auctionCurrent === 2 && auctionBids[0] === null && auctionBids[1] === null) {
        // Normal 3. oyuncu sırasında ve 1. ve 2. oyuncu teklif vermemiş
        sordumBtn.style.display = 'inline-block';
        bidBtn.style.display = 'inline-block';
        passBtn.style.display = 'inline-block';
    }
}

function endAuction() {
    auctionActive = false;
    document.getElementById('auction-controls').style.display = 'none';
    updateAuctionHighestBid();
    // En yüksek teklifi veren oyuncuyu bul
    let maxBid = -1;
    let winner = null;
    for (let i = 0; i < 4; i++) {
        if (auctionBids[i] !== null && auctionBids[i] > maxBid) {
            maxBid = auctionBids[i];
            winner = i;
        }
    }
    auctionHighestBid = maxBid;
    auctionWinner = winner;
    if (auctionWinner !== null) {
        document.getElementById('auction-status').textContent = `İhaleyi Oyuncu ${auctionWinner + 1} kazandı! Teklif: ${auctionHighestBid}`;
        // İhale sonucunu sesli okuma
        speakText(`İhaleyi Oyuncu ${auctionWinner + 1} kazandı. Teklif: ${auctionHighestBid}`);
        //calculateAndShowScores(); // Başlangıç puanlarını gösterme
        showTrumpSelect();
        // Burada koz seçimi ve ilk kart atımı başlatılabilir
    } else {
        document.getElementById('auction-status').textContent = 'İhalede kimse teklif vermedi.';
    }
}

function showTrumpSelect() {
    const trumpSelect = document.getElementById('trump-select');
    const trumpPlayer = document.getElementById('trump-player');
    
    if (trumpSelect) {
        trumpSelect.style.display = '';
    }
    
    if (trumpPlayer) {
        trumpPlayer.textContent = `Kozu seçme hakkı: Oyuncu ${auctionWinner + 1}`;
    } else {
        console.error('trump-player elementi bulunamadı');
    }
}

function hideTrumpSelect() {
    document.getElementById('trump-select').style.display = 'none';
}

let playedCards = [];
let currentPlayer = null; // Sırası gelen oyuncu
let firstPlayerOfTrick = null; // Elin ilk oyuncusu

function enableFirstPlay() {
    firstPlayerOfTrick = auctionWinner;
    currentPlayer = auctionWinner;
    renderPlayersWithClick(currentPlayer);
}

function renderPlayersWithClick(activePlayer) {
    // Elin başında ilk atılan kartın rengi (leadSuit) belirlenir
    let leadSuit = playedCards.length > 0 ? playedCards[0].card.suit : null;
    for (let i = 0; i < 4; i++) {
        const playerDiv = document.getElementById(`player${i+1}`);
        if (activePlayer === i) {
            playerDiv.classList.add('active-player');
        } else {
            playerDiv.classList.remove('active-player');
        }
        const cardsDiv = playerDiv.querySelector('.cards');
        cardsDiv.innerHTML = '';
        // Aktif oyuncunun oynayabileceği kartları belirle
        let allowedCards = null;
        if (i === activePlayer && leadSuit) {
            const hand = playersGlobal[i];
            const hasLeadSuit = hand.some(c => c.suit === leadSuit);
            const hasTrump = trumpSuit && hand.some(c => c.suit === trumpSuit);
            // Eğer açılan kart koz ise, koz yükseltme zorunluluğu uygula
            if (leadSuit === trumpSuit && hasTrump) {
                // Masadaki en yüksek kozun sırasını bul
                const playedTrumps = playedCards.filter(pc => pc.card.suit === trumpSuit).map(pc => pc.card);
                let maxTrumpRankIdx = -1;
                if (playedTrumps.length > 0) {
                    maxTrumpRankIdx = Math.min(...playedTrumps.map(c => rankOrder.indexOf(c.rank)));
                }
                // Elinde daha yüksek koz var mı?
                const higherTrumps = hand.filter(c => c.suit === trumpSuit && rankOrder.indexOf(c.rank) < maxTrumpRankIdx);
                if (playedTrumps.length > 0 && higherTrumps.length > 0) {
                    allowedCards = higherTrumps;
                } else {
                    allowedCards = hand.filter(c => c.suit === trumpSuit);
                }
            } else if (hasLeadSuit) {
                allowedCards = hand.filter(c => c.suit === leadSuit);
            } else if (hasTrump) {
                // Masada koz var mı? (ilk koz atan kim?)
                const playedTrumps = playedCards.filter(pc => pc.card.suit === trumpSuit).map(pc => pc.card);
                let maxTrumpRankIdx = -1;
                if (playedTrumps.length > 0) {
                    maxTrumpRankIdx = Math.min(...playedTrumps.map(c => rankOrder.indexOf(c.rank)));
                }
                // Elinde daha yüksek koz var mı?
                const higherTrumps = hand.filter(c => c.suit === trumpSuit && rankOrder.indexOf(c.rank) < maxTrumpRankIdx);
                if (playedTrumps.length > 0 && higherTrumps.length > 0) {
                    allowedCards = higherTrumps;
                } else {
                    allowedCards = hand.filter(c => c.suit === trumpSuit);
                }
            } else {
                allowedCards = hand;
            }
        }
        for (const suit of suitOrder) {
            const rowDiv = document.createElement('div');
            rowDiv.style.marginBottom = '2px';
            const suitCards = sortPlayerCards(playersGlobal[i]).filter(card => card.suit === suit);
            suitCards.forEach((card, idx) => {
                const cardDiv = document.createElement('span');
                cardDiv.className = 'card ' + suitClass[card.suit];
                cardDiv.textContent = card.rank + card.suit;
                if (activePlayer === null || i === activePlayer) {
                    // Sadece izin verilen kartlara tıklanabilirlik ver
                    let canPlay = true;
                    if (i === activePlayer && leadSuit) {
                        canPlay = allowedCards.some(c => c.suit === card.suit && c.rank === card.rank);
                    }
                    if (canPlay) {
                        cardDiv.style.cursor = 'pointer';
                        cardDiv.title = 'Bu kartı oyna';
                        cardDiv.addEventListener('click', () => {
                            playCard(i, card, suit, idx);
                        });
                    } else {
                        cardDiv.style.opacity = 0.5;
                        cardDiv.title = 'Bu kartı oynayamazsın';
                    }
                }
                rowDiv.appendChild(cardDiv);
            });
            cardsDiv.appendChild(rowDiv);
        }
    }
}

let playersGlobal = null;
// Oyun sonu puanlama için takımların topladığı kartlar
let team1Tricks = [];
let team2Tricks = [];
let lastTrickWinnerTeam = null;

// Birikimli takım puanları (2000 puana ulaşma için)
let cumulativeTeam1Score = 0;
let cumulativeTeam2Score = 0;

function playCard(playerIdx, card, suit, idxInSuit) {
    // Kartı oyuncunun elinden çıkar
    const hand = playersGlobal[playerIdx];
    for (let i = 0; i < hand.length; i++) {
        if (hand[i].suit === card.suit && hand[i].rank === card.rank) {
            hand.splice(i, 1);
            break;
        }
    }
    // Masaya ekle
    playedCards.push({ player: playerIdx, card });
    renderCenterCards();
    // Sıradaki oyuncuya geç
    if (playedCards.length < 4) {
        currentPlayer = (currentPlayer + 1) % 4;
        renderPlayersWithClick(currentPlayer);
    } else {
        // 4 kart atıldıysa, 1 saniye bekle, masayı temizle ve yeni eli başlat
        setTimeout(() => {
            const winner = findTrickWinner();
            const trickCards = playedCards.map(pc => pc.card);
            const winnerTeam = (winner % 2 === 0) ? 1 : 2; // 0 ve 2: Takım 1, 1 ve 3: Takım 2
            // Son trick ise, lastTrickWinnerTeam'i set et ve kartları ekle
            if (
                playersGlobal[0].length === 0 &&
                playersGlobal[1].length === 0 &&
                playersGlobal[2].length === 0 &&
                playersGlobal[3].length === 0
            ) {
                lastTrickWinnerTeam = winnerTeam;
                if (winnerTeam === 1) team1Tricks.push(...trickCards);
                else team2Tricks.push(...trickCards);
                calculateEndGameScores();
            } else {
                if (winnerTeam === 1) team1Tricks.push(...trickCards);
                else team2Tricks.push(...trickCards);
            }
            playedCards = [];
            renderCenterCards();
            firstPlayerOfTrick = winner;
            currentPlayer = winner;
            renderPlayersWithClick(currentPlayer);
        }, 1000);
    }
}

// Elin kazananını bul (ilk atılan kartın rengine bak, en büyük kartı atan kazanır, koz varsa koza bakılır)
function findTrickWinner() {
    if (playedCards.length !== 4) return null;
    const leadSuit = playedCards[0].card.suit;
    let bestIdx = 0;
    let bestCard = playedCards[0].card;
    for (let i = 1; i < 4; i++) {
        const c = playedCards[i].card;
        // Önce koz var mı bak
        if (trumpSuit && c.suit === trumpSuit && bestCard.suit !== trumpSuit) {
            bestIdx = i;
            bestCard = c;
        } else if (c.suit === bestCard.suit) {
            // Aynı renktense büyüklüğe bak
            if (rankOrder.indexOf(c.rank) < rankOrder.indexOf(bestCard.rank)) {
                bestIdx = i;
                bestCard = c;
            }
        }
    }
    return playedCards[bestIdx].player;
}

function renderCenterCards() {
    const centerDiv = document.getElementById('center-cards');
    centerDiv.innerHTML = '';
    playedCards.forEach(play => {
        const cardDiv = document.createElement('span');
        cardDiv.className = 'card ' + suitClass[play.card.suit];
        cardDiv.textContent = play.card.rank + play.card.suit;
        cardDiv.title = `Oyuncu ${play.player + 1}`;
        centerDiv.appendChild(cardDiv);
    });
}

function calculateAndShowScores() {
    const scores = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        const hand = playersGlobal[i];
        let sritKoz = false;
        // 1. Kozda srit var mı?
        if (trumpSuit &&
            hand.filter(c => c.suit === trumpSuit && c.rank === 'A').length > 0 &&
            hand.filter(c => c.suit === trumpSuit && c.rank === '10').length > 0 &&
            hand.filter(c => c.suit === trumpSuit && c.rank === 'K').length > 0 &&
            hand.filter(c => c.suit === trumpSuit && c.rank === 'Q').length > 0 &&
            hand.filter(c => c.suit === trumpSuit && c.rank === 'J').length > 0) {
            sritKoz = true;
            scores[i] += 150;
        }
        // 2. Koz renginde toplam K ve Q sayısı
        let kozKCount = hand.filter(c => c.suit === trumpSuit && c.rank === 'K').length;
        let kozQCount = hand.filter(c => c.suit === trumpSuit && c.rank === 'Q').length;
        // Srit için bir K ve bir Q kullanıldıysa, fazladan kalan çiftler için 40 puan ekle
        let extraKozEvli = 0;
        if (kozKCount > 0 && kozQCount > 0) {
            let usedK = sritKoz ? 1 : 0;
            let usedQ = sritKoz ? 1 : 0;
            let kalanK = kozKCount - usedK;
            let kalanQ = kozQCount - usedQ;
            extraKozEvli = Math.min(kalanK, kalanQ);
            scores[i] += extraKozEvli * 40;
        }
        // 3. Diğer renklerdeki her K+Q çifti için 20 puan
        for (const suit of suitOrder) {
            if (suit === trumpSuit) continue;
            let kCount = hand.filter(c => c.suit === suit && c.rank === 'K').length;
            let qCount = hand.filter(c => c.suit === suit && c.rank === 'Q').length;
            let evliCount = Math.min(kCount, qCount);
            scores[i] += evliCount * 20;
        }
        // 4. Farklı renklerden 4 J
        if (suitOrder.every(suit => hand.some(c => c.suit === suit && c.rank === 'J'))) {
            scores[i] += 40;
        }
        // 5. Farklı renklerden 4 Q
        if (suitOrder.every(suit => hand.some(c => c.suit === suit && c.rank === 'Q'))) {
            scores[i] += 60;
        }
        // 6. Farklı renklerden 4 K
        if (suitOrder.every(suit => hand.some(c => c.suit === suit && c.rank === 'K'))) {
            scores[i] += 80;
        }
        // 7. Farklı renklerden 4 As
        if (suitOrder.every(suit => hand.some(c => c.suit === suit && c.rank === 'A'))) {
            scores[i] += 100;
        }
        // 8. Q♠ + J♦
        if (hand.some(c => c.suit === '♠' && c.rank === 'Q') && hand.some(c => c.suit === '♦' && c.rank === 'J')) {
            scores[i] += 40;
        }
        // 9. (Koz dışında) Aynı renkten A+10+K+Q+J (srit)
        for (const suit of suitOrder) {
            if (suit === trumpSuit) continue;
            if (
                hand.some(c => c.suit === suit && c.rank === 'A') &&
                hand.some(c => c.suit === suit && c.rank === '10') &&
                hand.some(c => c.suit === suit && c.rank === 'K') &&
                hand.some(c => c.suit === suit && c.rank === 'Q') &&
                hand.some(c => c.suit === suit && c.rank === 'J')
            ) {
                scores[i] += 150;
            }
        }
        // 10. Koz ile aynı renkteki 9'lar (her biri 10 puan)
        if (trumpSuit) {
            const nines = hand.filter(c => c.suit === trumpSuit && c.rank === '9').length;
            scores[i] += nines * 10;
        }
    }
    // Tabloyu oluştur
    const tableDiv = document.getElementById('score-table');
    let html = '<table style="width:100%;background:#fff;color:#222;border-radius:8px;text-align:center;font-size:18px;"><tr><th>Oyuncu</th><th>Puan</th></tr>';
    for (let i = 0; i < 4; i++) {
        html += `<tr><td>Oyuncu ${i+1}</td><td>${scores[i]}</td></tr>`;
    }
    // Takım puanlarını ekle
    const team1 = scores[0] + scores[2];
    const team2 = scores[1] + scores[3];
    html += `<tr style='font-weight:bold;background:#eee;'><td>Takım 1 (1 & 3)</td><td>${team1}</td></tr>`;
    html += `<tr style='font-weight:bold;background:#eee;'><td>Takım 2 (2 & 4)</td><td>${team2}</td></tr>`;
    html += '</table>';
    tableDiv.innerHTML = html;
    tableDiv.style.display = '';
}
// Koz seçimi butonunda, koz seçildikten sonra puanları göster
Array.from(document.getElementsByClassName('trump-btn')).forEach(btn => {
    btn.addEventListener('click', function() {
        if (auctionWinner === null) return;
        trumpSuit = this.getAttribute('data-suit');
        // Kozun Türkçe adını belirle
        let kozAd = '';
        switch(trumpSuit) {
            case '♥': kozAd = 'Kupa'; break;
            case '♠': kozAd = 'Maça'; break;
            case '♦': kozAd = 'Karo'; break;
            case '♣': kozAd = 'Sinek'; break;
            default: kozAd = trumpSuit;
        }
        speakText(`Seçilen koz: ${kozAd}`);
        hideTrumpSelect();
        document.getElementById('auction-status').textContent += ` | Koz: ${trumpSuit}`;
        // Koz seçildikten sonra ilk kart atımı başlasın
        enableFirstPlay();
        calculateAndShowScores();
    });
});

document.getElementById('bid-btn').addEventListener('click', () => {
    if (!auctionActive) return;
    const bid = parseInt(document.getElementById('bid-input').value, 10);
    // İlk teklif mi?
    const isFirstBid = auctionHighestBid === 150 && auctionBids.every(b => b === null);
    if (
        isNaN(bid) ||
        bid < 150 ||
        bid % 10 !== 0 ||
        (!isFirstBid && (bid <= auctionHighestBid || bid < auctionHighestBid + 10))
    ) {
        alert('Teklif, mevcut en yüksekten en az 10 fazla, en az 150 ve 10\'un katı olmalı!');
        return;
    }
    auctionBids[auctionCurrent] = bid;
    auctionTurns++;
    auctionHighestBid = bid;
    updateAuctionHighestBid();
    speakText(`Oyuncu ${auctionCurrent + 1} teklif verdi: ${bid}`);

    // Sordum/Konuş sonrası 3. oyuncu teklif verirse sadece sırayı 4. oyuncuya geçir
    if (sordumKonusMode && konusPlayer === 3 && auctionCurrent === 2) {
        auctionCurrent = 3;
        nextAuctionTurn();
        return;
    }
    // Sordum/Konuş sonrası 4. oyuncu teklif verirse ihale hemen 4. oyuncuda kalır ve biter
    if (sordumKonusMode && konusPlayer === 3 && auctionCurrent === 3) {
        sordumKonusMode = false;
        konusPlayer = null;
        sordumPlayer = null;
        auctionWinner = 3;
        speakText(`İhale Oyuncu 4'e kaldı. Teklif: ${auctionHighestBid}`);
        endAuction();
        return;
    }
    auctionCurrent = (auctionCurrent + 1) % 4;
    nextAuctionTurn();
});

document.getElementById('pass-btn').addEventListener('click', () => {
    if (!auctionActive) return;
    speakText(`Oyuncu ${auctionCurrent + 1} pas`);
    auctionPasses[auctionCurrent] = true;
    auctionTurns++;

    // Sordum/Konuş sonrası 3. oyuncu konuş sonrası pas derse, ihale 4. oyuncuya 150'ye kalır
    if (auctionCurrent === 2 && sordumKonusMode && konusPlayer === 3) {
        auctionBids[3] = 150;
        auctionHighestBid = 150;
        auctionWinner = 3;
        speakText(`İhale Oyuncu 4'e 150'ye kaldı`);
        sordumKonusMode = false;
        endAuction();
        return;
    }
    // Sordum/Konuş sonrası 4. oyuncu pas derse ihale 3. oyuncuya kalır ve biter
    if (auctionCurrent === 3 && sordumKonusMode && konusPlayer === 3 && auctionBids[2] !== null) {
        auctionWinner = 2;
        auctionHighestBid = auctionBids[2];
        speakText(`İhale Oyuncu 3'e kaldı. Teklif: ${auctionHighestBid}`);
        sordumKonusMode = false;
        konusPlayer = null;
        sordumPlayer = null;
        endAuction();
        return;
    }
    auctionCurrent = (auctionCurrent + 1) % 4;
    nextAuctionTurn();
    updateAuctionHighestBid();
});

// Samandağ Pinaki - Sordum butonu
document.getElementById('sordum-btn').addEventListener('click', () => {
    if (!auctionActive || auctionCurrent !== 2) return;
    // Sordum dendiğinde sesli okuma
    speakText(`Oyuncu ${auctionCurrent + 1} sordum dedi`);
    sordumKonusMode = true;
    sordumPlayer = auctionCurrent;
    auctionTurns++;
    auctionCurrent = (auctionCurrent + 1) % 4; // Sıra 4. oyuncuya geçer
    nextAuctionTurn();
});

// Samandağ Pinaki - Konuş butonu (3. oyuncu için)
document.getElementById('konus-btn').addEventListener('click', () => {
    if (!auctionActive) return;
    
    if (auctionCurrent === 2 && !sordumKonusMode) {
        // 3. oyuncu direkt konuş diyor
        speakText(`Oyuncu ${auctionCurrent + 1} konuş dedi`);
        auctionTurns++;
        auctionCurrent = (auctionCurrent + 1) % 4;
        nextAuctionTurn();
    } else if (auctionCurrent === 3 && sordumKonusMode) {
        // 4. oyuncu 3. oyuncuya konuş diyor
        speakText(`Oyuncu ${auctionCurrent + 1} konuş dedi`);
        konusPlayer = auctionCurrent;
        auctionCurrent = 2; // Sıra 3. oyuncuya geri döner
        nextAuctionTurn();
    }
});

// Samandağ Pinaki - Boz butonu
document.getElementById('boz-btn').addEventListener('click', () => {
    if (!auctionActive || auctionCurrent !== 3 || !sordumKonusMode) return;
    // Boz dendiğinde sesli okuma
    speakText(`Oyuncu ${auctionCurrent + 1} boz dedi`);
    
    // İhale ve koz ekranlarını sıfırla
    document.getElementById('auction-controls').style.display = 'none';
    document.getElementById('trump-select').style.display = 'none';
    document.getElementById('auction-status').textContent = 'Kartlar dağıtıldıktan sonra ihale başlayacak.';
    
    // Pota kutusunu temizle
    const potaMessages = document.getElementById('pota-chat-messages');
    const potaInput = document.getElementById('pota-chat-input');
    if (potaMessages) {
        potaMessages.innerHTML = '';
    }
    if (potaInput) {
        potaInput.value = '';
    }
    if (window.potaChatLog) {
        window.potaChatLog = [];
    }
    
    // Skor tablosunu sıfırla (oyuncu ve takım puanlarını 0 yap)
    const tableDiv = document.getElementById('score-table');
    if (tableDiv) {
        let html = '<table style="width:100%;background:#fff;color:#222;border-radius:8px;text-align:center;font-size:18px;"><tr><th>Oyuncu</th><th>Puan</th></tr>';
        for (let i = 0; i < 4; i++) {
            html += `<tr><td>Oyuncu ${i+1}</td><td>0</td></tr>`;
        }
        html += `<tr style='font-weight:bold;background:#eee;'><td>Takım 1 (1 & 3)</td><td>0</td></tr>`;
        html += `<tr style='font-weight:bold;background:#eee;'><td>Takım 2 (2 & 4)</td><td>0</td></tr>`;
        html += `<tr style='font-weight:bold;background:#ffd700;color:#222;'><td>Birikimli Takım 1</td><td>${cumulativeTeam1Score}</td></tr>`;
        html += `<tr style='font-weight:bold;background:#ffd700;color:#222;'><td>Birikimli Takım 2</td><td>${cumulativeTeam2Score}</td></tr>`;
        html += '</table>';
        tableDiv.innerHTML = html;
        tableDiv.style.display = '';
    }
    
    // Oyun sonu sonucu sıfırla
    const resultDiv = document.getElementById('endgame-result');
    if (resultDiv) resultDiv.innerHTML = '';
    
    // Sağ alt köşedeki game-result kutusunu gizle
    const gameResultDiv = document.getElementById('game-result');
    if (gameResultDiv) {
        gameResultDiv.style.display = 'none';
    }
    
    // Kartları yeniden dağıt
    let deck = createDeck();
    deck = shuffle(deck);
    const players = dealCards(deck);
    playersGlobal = players;
    playedCards = [];
    team1Tricks = [];
    team2Tricks = [];
    lastTrickWinnerTeam = null;
    renderPlayers(players);
    renderCenterCards();
    
    // İhaleyi sıfırla ve yeniden başlat
    startAuction();
});

// Kartlar dağıtıldıktan sonra ihale başlat
const oldDealBtnHandler = document.getElementById('dealBtn').onclick;
document.getElementById('dealBtn').addEventListener('click', () => {
    // --- EK: Skor ve pota kutusu sıfırlama ---
    // Birikimli puanları sıfırlama - artık saklanıyor
    // cumulativeTeam1Score = 0; // Bu satırı kaldırdık
    // cumulativeTeam2Score = 0; // Bu satırı kaldırdık
    
    // İhale ve koz ekranlarını sıfırla
    document.getElementById('auction-controls').style.display = 'none';
    document.getElementById('trump-select').style.display = 'none';
    document.getElementById('auction-status').textContent = 'Kartlar dağıtıldıktan sonra ihale başlayacak.';
    
    // Pota kutusunu temizle
    const potaMessages = document.getElementById('pota-chat-messages');
    const potaInput = document.getElementById('pota-chat-input');
    if (potaMessages) {
        potaMessages.innerHTML = '';
    }
    if (potaInput) {
        potaInput.value = '';
    }
    if (window.potaChatLog) {
        window.potaChatLog = [];
    }
    
    // Skor tablosunu sıfırla (oyuncu ve takım puanlarını 0 yap)
    const tableDiv = document.getElementById('score-table');
    if (tableDiv) {
        let html = '<table style="width:100%;background:#fff;color:#222;border-radius:8px;text-align:center;font-size:18px;"><tr><th>Oyuncu</th><th>Puan</th></tr>';
        for (let i = 0; i < 4; i++) {
            html += `<tr><td>Oyuncu ${i+1}</td><td>0</td></tr>`;
        }
        html += `<tr style='font-weight:bold;background:#eee;'><td>Takım 1 (1 & 3)</td><td>0</td></tr>`;
        html += `<tr style='font-weight:bold;background:#eee;'><td>Takım 2 (2 & 4)</td><td>0</td></tr>`;
        html += `<tr style='font-weight:bold;background:#ffd700;color:#222;'><td>Birikimli Takım 1</td><td>${cumulativeTeam1Score}</td></tr>`;
        html += `<tr style='font-weight:bold;background:#ffd700;color:#222;'><td>Birikimli Takım 2</td><td>${cumulativeTeam2Score}</td></tr>`;
        html += '</table>';
        tableDiv.innerHTML = html;
        tableDiv.style.display = '';
    }
    // Oyun sonu sonucu sıfırla
    const resultDiv = document.getElementById('endgame-result');
    if (resultDiv) resultDiv.innerHTML = '';
    // Sağ alt köşedeki game-result kutusunu gizle
    const gameResultDiv = document.getElementById('game-result');
    if (gameResultDiv) {
        gameResultDiv.style.display = 'none';
    }
    // Pota kutusunu temizle
    const potaChatMessages = document.getElementById('pota-chat-messages');
    if (potaChatMessages) potaChatMessages.innerHTML = '';
    if (window.potaChatLog) window.potaChatLog = [];
    // --- mevcut kart dağıt kodu ---
    let deck = createDeck();
    deck = shuffle(deck);
    const players = dealCards(deck);
    playersGlobal = players;
    playedCards = [];
    team1Tricks = [];
    team2Tricks = [];
    lastTrickWinnerTeam = null;
    renderPlayers(players);
    renderCenterCards();
    startAuction();
});

// Oyun sonu puanlaması: Her As ve 10'lu 10 puan, K ve Q 5 puan, son eli alan takım 10 puan
function calculateEndGameScores() {
    function trickPoints(cards) {
        let points = 0;
        for (const c of cards) {
            if (c.rank === 'A' || c.rank === '10') points += 10;
            else if (c.rank === 'K' || c.rank === 'Q') points += 5;
        }
        return points;
    }
    let t1 = trickPoints(team1Tricks);
    let t2 = trickPoints(team2Tricks);
    // Bonus 10 puan sadece son eli kazanan takıma eklenmeli
    if (lastTrickWinnerTeam === 1) t1 += 10;
    else if (lastTrickWinnerTeam === 2) t2 += 10;
    
    // Takımların başlangıç puanlarını score-table'dan çek
    const s1 = parseInt(document.querySelector('#score-table tr:nth-child(2) td:last-child').textContent, 10);
    const s2 = parseInt(document.querySelector('#score-table tr:nth-child(3) td:last-child').textContent, 10);
    const s3 = parseInt(document.querySelector('#score-table tr:nth-child(4) td:last-child').textContent, 10);
    const s4 = parseInt(document.querySelector('#score-table tr:nth-child(5) td:last-child').textContent, 10);
    let team1Start = s1 + s3;
    let team2Start = s2 + s4;
    let kabbut = false;
    let oyunBatti = false;
    let cezaPuan = 0;
    
    // Kabbut kontrolü: ihaleyi kazanan takım tüm elleri aldıysa
    let kazananTakim = null;
    if (auctionWinner === 0 || auctionWinner === 2) kazananTakim = 1;
    if (auctionWinner === 1 || auctionWinner === 3) kazananTakim = 2;
    if (kazananTakim === 1 && t2 === 0) {
        team2Start = 0;
        kabbut = true;
    } else if (kazananTakim === 2 && t1 === 0) {
        team1Start = 0;
        kabbut = true;
    }
    
    let team1Total = team1Start + t1;
    let team2Total = team2Start + t2;
    let teklif = auctionHighestBid;
    
    // Oyun Battı kontrolü
    if (kazananTakim && teklif) {
        if ((kazananTakim === 1 && team1Total < teklif)) {
            oyunBatti = true;
            cezaPuan = teklif;
            team1Start = 0;
            team1Total = -cezaPuan;
        } else if ((kazananTakim === 2 && team2Total < teklif)) {
            oyunBatti = true;
            cezaPuan = teklif;
            team2Start = 0;
            team2Total = -cezaPuan;
        }
    }
    
    // Birikimli puanları güncelle - her iki takımın da toplam puanları biriktirilir
    if (oyunBatti) {
        // Oyun battığında, battan takımın birikimli puanından ihale teklif puanı çıkarılır
        if (kazananTakim === 1) {
            cumulativeTeam1Score -= cezaPuan;
        } else if (kazananTakim === 2) {
            cumulativeTeam2Score -= cezaPuan;
        }
        // Diğer takımın puanı normal şekilde biriktirilir
        if (kazananTakim === 1) {
            cumulativeTeam2Score += team2Total;
        } else if (kazananTakim === 2) {
            cumulativeTeam1Score += team1Total;
        }
    } else {
        // Normal durumda her iki takımın da toplam puanlarını biriktir
        cumulativeTeam1Score += team1Total;
        cumulativeTeam2Score += team2Total;
    }
    
    // 2000 puana ulaşma kontrolü
    let gameWinner = null;
    if (cumulativeTeam1Score >= 2000) {
        gameWinner = 1;
    } else if (cumulativeTeam2Score >= 2000) {
        gameWinner = 2;
    }
    
    // Sonucu ekrana yaz
    const resultDiv = document.getElementById('endgame-result');
    resultDiv.innerHTML = `Oyun Sonu Sonuçları:<br>
    Takım 1 (1 & 3): <b>${t1}</b> puan<br>
    Takım 2 (2 & 4): <b>${t2}</b> puan<br>
    1. Takımın Toplam Puanı: <b>${team1Start} + ${t1} = ${team1Total}</b><br>
    2. Takımın Toplam Puanı: <b>${team2Start} + ${t2} = ${team2Total}</b><br>
    <br><strong>Birikimli Puanlar:</strong><br>
    Takım 1: <b>${cumulativeTeam1Score}</b> puan<br>
    Takım 2: <b>${cumulativeTeam2Score}</b> puan`
    + (kabbut ? `<br><span style='color:#ff4444;font-weight:bold;'>Kabbut! Rakip takımın puanı sıfırlandı.</span>` : '')
    + (oyunBatti ? `<br><span style='color:#ff2222;font-weight:bold;'>Oyun Battı! Takımın puanı sıfırlandı ve -${cezaPuan} ceza puanı verildi.</span>` : '')
    + (gameWinner ? `<br><span style='color:#00ff00;font-weight:bold;font-size:24px;'>🎉 TAKIM ${gameWinner} OYUNU KAZANDI! 🎉</span>` : '');

    // Sonucu sağ alt köşeye yaz
    const gameResultDiv = document.getElementById('game-result');
    if (gameResultDiv) {
        if (gameWinner) {
            gameResultDiv.textContent = `Takım ${gameWinner} oyunu kazandı!`;
            gameResultDiv.style.display = '';
        } else if (kazananTakim && teklif) {
            if (oyunBatti) {
                gameResultDiv.textContent = 'Oyun Battı!';
            } else if (team1Total >= teklif && kazananTakim === 1) {
                gameResultDiv.textContent = 'Oyunu kazandınız.';
            } else if (team2Total >= teklif && kazananTakim === 2) {
                gameResultDiv.textContent = 'Oyunu kazandınız.';
            } else {
                gameResultDiv.textContent = 'Oyunu kaybettiniz.';
            }
            gameResultDiv.style.display = '';
        } else {
            gameResultDiv.style.display = 'none';
        }
    }
    
    // Sonuç tablosunu görünür yap
    document.getElementById('score-table').style.display = '';

    // --- EK: Pota kutusunu ve skor tablosunu sıfırla ---
    // Pota kutusunu temizle
    const potaChatMessages = document.getElementById('pota-chat-messages');
    if (potaChatMessages) potaChatMessages.innerHTML = '';
    if (window.potaChatLog) window.potaChatLog = [];
    // Skor tablosunu sıfırla (oyuncu ve takım puanlarını 0 yap)
    const tableDiv = document.getElementById('score-table');
    if (tableDiv) {
        let html = '<table style="width:100%;background:#fff;color:#222;border-radius:8px;text-align:center;font-size:18px;"><tr><th>Oyuncu</th><th>Puan</th></tr>';
        for (let i = 0; i < 4; i++) {
            html += `<tr><td>Oyuncu ${i+1}</td><td>0</td></tr>`;
        }
        html += `<tr style='font-weight:bold;background:#eee;'><td>Takım 1 (1 & 3)</td><td>0</td></tr>`;
        html += `<tr style='font-weight:bold;background:#eee;'><td>Takım 2 (2 & 4)</td><td>0</td></tr>`;
        html += '</table>';
        tableDiv.innerHTML = html;
    }
}

// Global speakText fonksiyonu
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utter = new window.SpeechSynthesisUtterance(text);
        utter.lang = 'tr-TR';
        window.speechSynthesis.speak(utter);
    }
}

window.onload = function() {
    // Pota iletişim kutusu işlevselliği
    const potaChatMessages = document.getElementById('pota-chat-messages');
    const potaChatInput = document.getElementById('pota-chat-input');
    const potaChatSend = document.getElementById('pota-chat-send');
    window.potaChatLog = [];

    function getCurrentPlayerNumber() {
        if (typeof auctionActive !== 'undefined' && auctionActive) return auctionCurrent + 1;
        if (typeof currentPlayer !== 'undefined' && currentPlayer !== null) return currentPlayer + 1;
        return '?';
    }

    function addPotaMessage(msg, playerNum) {
        window.potaChatLog.push({msg, playerNum});
        const lastMsgs = window.potaChatLog.slice(-10);
        potaChatMessages.innerHTML = lastMsgs.map(m => `<div><b>Oyuncu ${m.playerNum}:</b> ${m.msg}</div>`).join('');
        potaChatMessages.scrollTop = potaChatMessages.scrollHeight;
    }

    potaChatSend.addEventListener('click', () => {
        const text = potaChatInput.value.trim();
        if (!text) return;
        
        const playerNum = getCurrentPlayerNumber();
        addPotaMessage(text, playerNum);
        speakText(`Oyuncu ${playerNum}: ${text}`);
        potaChatInput.value = '';
        potaChatInput.focus();
        
        // Koz belirlenmeden önce oyun akışını etkilesin, belirlendikten sonra sadece sohbet olsun
        if (trumpSuit === null) {
            // Koz belirlenmeden önce: sıra değişsin
            if (typeof auctionActive !== 'undefined' && auctionActive) {
                auctionTurns++;
                auctionCurrent = (auctionCurrent + 1) % 4;
                nextAuctionTurn();
            } else if (typeof currentPlayer !== 'undefined' && currentPlayer !== null) {
                currentPlayer = (currentPlayer + 1) % 4;
                renderPlayersWithClick(currentPlayer);
            }
        }
        // Koz belirlendikten sonra sadece sohbet amaçlı, oyuncu sırasını etkilemez
    });

    // Enter tuşu ile de mesaj gönder
    potaChatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            potaChatSend.click();
        }
    });


};