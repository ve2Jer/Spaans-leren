/* =========================================================
   WOORDENLIJST — makkelijk zelf uit te breiden.

   Per regel:  spaans | nederlands | voorbeeldzin (es) | vertaling voorbeeldzin | tip (optioneel)
   - Zelfstandige naamwoorden altijd met lidwoord (el / la / los / las).
   - Lege regels en regels die met # beginnen worden genegeerd.
   - Een nieuwe unit = een nieuw blok in "units".
   - Zinnen (phrases): spaans | nederlands | tip (optioneel)

   Je kunt ook woorden toevoegen in de app zelf (tab Woorden → +).
   Taalvariant: Spaans uit Spanje (castellano): vosotros, coger, ordenador, móvil.
   ========================================================= */

const DOMAINS = [
  {
    id: 'padel',
    title: 'Padel op de baan',
    short: 'Padel',
    icon: '🎾',
    color: '#30B0C7',
    units: [
      {
        title: 'De baan',
        words: `
          la pista | de baan | ¿Reservamos una pista para mañana? | Reserveren we morgen een baan?
          la pala | het padelracket | Me he comprado una pala nueva. | Ik heb een nieuw racket gekocht.
          la bola | de bal | Abre un bote de bolas nuevas. | Open een nieuwe koker ballen.
          la red | het net | La bola ha tocado la red. | De bal heeft het net geraakt.
          la pared | de wand | Deja pasar la bola y juega con la pared. | Laat de bal gaan en speel met de wand.
          el cristal | het glas | La bola ha dado en el cristal. | De bal raakte het glas.
          la reja | het hek (gaas) | Cuidado, en la reja la bola bota raro. | Pas op, bij het hek stuitert de bal raar.
          el vestuario | de kleedkamer | Nos vemos en el vestuario. | We zien elkaar in de kleedkamer.
        `,
        phrases: `
          ¿Jugamos un partido? | Spelen we een potje?
          ¿A qué hora reservamos la pista? | Hoe laat reserveren we de baan?
          ¿Peloteamos un poco? | Slaan we even in?
          ¿Dónde está el vestuario? | Waar is de kleedkamer?
        `,
      },
      {
        title: 'Slagen',
        words: `
          el saque | de opslag | Tu saque, empiezas tú. | Jouw opslag, jij begint.
          el resto | de return | Tienes un resto muy bueno. | Je hebt een heel goede return.
          la volea | de volley | Sube a la red y haz la volea. | Ga naar het net en speel de volley.
          la derecha | de forehand | Juega más con la derecha. | Speel meer met je forehand.
          el revés | de backhand | Mi revés todavía es débil. | Mijn backhand is nog zwak.
          el globo | de lob | Tira un globo, están en la red. | Speel een lob, ze staan aan het net.
          el remate | de smash | ¡Vaya remate! | Wat een smash!
          la bandeja | de bandeja | La bandeja es el golpe más importante. | De bandeja is de belangrijkste slag.
        `,
        phrases: `
          ¿Quién saca? | Wie slaat op?
          Sube a la red conmigo | Kom met me naar het net
          Juega más globos | Speel meer lobs
          Quédate atrás | Blijf achterin
        `,
      },
      {
        title: 'Muurspel & specials',
        words: `
          la víbora | de víbora (smash met veel slice) | Hoy quiero entrenar la víbora. | Vandaag wil ik de víbora trainen.
          la chiquita | de chiquita (zachte bal op de voeten) | Juega una chiquita a sus pies. | Speel een chiquita op zijn voeten.
          la bajada | de bajada (aanval na de wand) | Ataca con una bajada de pared. | Val aan met een bajada uit de wand.
          la salida de pared | de bal uit de wand spelen | Tu salida de pared es muy buena. | Jij speelt de bal heel goed uit de wand.
          la contrapared | de contrapared (via eigen wand) | Ha salvado el punto con una contrapared. | Hij redde het punt met een contrapared.
          el por tres | smash over de wand de baan uit | ¡Qué remate por tres! | Wat een smash de baan uit!
          el por cuatro | smash via de zijdeur de baan uit | Ha sacado la bola por cuatro. | Hij smashte de bal via de deur eruit.
          el golpe | de slag | ¿Qué golpe quieres practicar hoy? | Welke slag wil je vandaag oefenen?
        `,
        phrases: `
          Deja pasar la bola | Laat de bal gaan
          Espera la pared | Wacht op de wand
          ¡Qué punto! | Wat een punt!
          Ha sido red | Het was een netbal
        `,
      },
      {
        title: 'Wedstrijd & telling',
        words: `
          el punto de oro | het gouden punt (bij 40-40) | Cuarenta iguales, punto de oro. | 40-40, gouden punt.
          el juego | de game | Vamos tres juegos a uno. | We staan 3-1 in games.
          el set | de set | Hemos perdido el primer set. | We hebben de eerste set verloren.
          el partido | de wedstrijd | ¿Jugamos un partido el sábado? | Spelen we zaterdag een wedstrijd?
          el compañero | de medespeler | Mi compañero juega en el lado de revés. | Mijn medespeler speelt aan de backhandkant.
          la pareja | het duo / de partner | Somos una pareja nueva. | We zijn een nieuw duo.
          el lado de derecha | de forehandkant (rechts) | Yo juego en el lado de derecha. | Ik speel aan de forehandkant.
          el lado de revés | de backhandkant (links) | ¿Prefieres el lado de revés? | Speel je liever aan de backhandkant?
        `,
        phrases: `
          ¿Cómo vamos? | Hoe staat het?
          ¿Cambiamos de lado? | Wisselen we van kant?
          ¿Echamos otro set? | Spelen we nog een set?
          ¿Qué lado prefieres? | Welke kant speel je liever?
        `,
      },
      {
        title: 'Roepen op de baan',
        words: `
          ¡mía! | mijn bal! | ¡Mía! ¡Déjala! | Mijn bal! Laat hem!
          ¡tuya! | jouw bal! | ¡Tuya! Yo no llego. | Jouw bal! Ik kom er niet bij.
          ¡fuera! | uit! | ¡Fuera! Ha dado en la reja. | Uit! Hij raakte het hek.
          ¡bien jugado! | goed gespeeld! | ¡Bien jugado, compañero! | Goed gespeeld, partner!
          ¡vamos! | kom op! | ¡Vamos, que podemos! | Kom op, we kunnen het!
          ¡cambio! | wissel! | Nos han pasado el globo, ¡cambio! | Ze speelden een lob over ons heen, wissel!
          ¡buena! | in! (goede bal) | ¡Buena! Ha entrado. | In! Hij was goed.
          ¡perdón! | sorry! | ¡Perdón! Ha tocado la red. | Sorry! Hij raakte het net.
        `,
        phrases: `
          Ha sido buena | Hij was in
          ¿Repetimos el punto? | Spelen we het punt over?
          Buen partido, gracias | Goede wedstrijd, bedankt
          ¿Tomamos algo después? | Drinken we na afloop wat?
        `,
      },
      {
        title: 'Training & toernooi',
        words: `
          el entrenador | de trainer | El entrenador nos corrige la bandeja. | De trainer verbetert onze bandeja.
          la clase | de les | Tengo clase a las siete. | Ik heb om zeven uur les.
          el nivel | het niveau | ¿Qué nivel tienes? | Wat is jouw niveau?
          el torneo | het toernooi | Nos apuntamos al torneo del club. | We schrijven ons in voor het clubtoernooi.
          el cuadro | het speelschema (draw) | Ya ha salido el cuadro del torneo. | Het speelschema van het toernooi is uit.
          la final | de finale | Hemos llegado a la final. | We hebben de finale gehaald.
          el premio | de prijs | El premio es una pala nueva. | De prijs is een nieuw racket.
          reservar | reserveren | Voy a reservar pista para las ocho. | Ik ga een baan reserveren voor acht uur.
        `,
        phrases: `
          ¿Qué nivel tenéis? | Welk niveau hebben jullie? | tenéis = jullie hebben (vosotros-vorm, Spanje)
          Llevo dos años jugando | Ik speel al twee jaar
          ¿Cuánto cuesta la clase? | Hoeveel kost de les?
          ¿Nos apuntamos al torneo? | Schrijven we ons in voor het toernooi?
        `,
      },
    ],
  },
  {
    id: 'product',
    title: 'Product & data',
    short: 'PadelPlay',
    icon: '📲',
    color: '#5856D6',
    units: [
      {
        title: 'Sensor & app',
        words: `
          el sensor | de sensor | El sensor se lleva en la muñeca. | De sensor draag je om de pols.
          la muñeca | de pols | Ponte el sensor en la muñeca. | Doe de sensor om je pols.
          la aplicación | de app | Descárgate la aplicación en el móvil. | Download de app op je mobiel.
          el móvil | de mobiel | Conecta el sensor con el móvil. | Verbind de sensor met je mobiel.
          la batería | de batterij | La batería dura diez horas. | De batterij gaat tien uur mee.
          cargar | opladen | Hay que cargar el sensor antes del partido. | Je moet de sensor voor de wedstrijd opladen.
          conectar | verbinden | No consigo conectar el sensor. | Het lukt me niet de sensor te verbinden.
          descargar | downloaden | Puedes descargar la app gratis. | Je kunt de app gratis downloaden.
        `,
        phrases: `
          Te hago una demo | Ik geef je een demo
          Funciona con cualquier pala | Het werkt met elk racket
          ¿Cuánto dura la batería? | Hoe lang gaat de batterij mee?
          Se conecta por Bluetooth | Hij verbindt via Bluetooth
        `,
      },
      {
        title: 'Data & prestaties',
        words: `
          los datos | de data | Los datos se ven en tiempo real. | De data zie je realtime.
          la velocidad | de snelheid | Mide la velocidad de cada golpe. | Hij meet de snelheid van elke slag.
          la potencia | de kracht (power) | Tu remate tiene mucha potencia. | Je smash heeft veel power.
          el rendimiento | de prestatie | Analizamos tu rendimiento en la pista. | We analyseren je prestaties op de baan.
          las estadísticas | de statistieken | Mira tus estadísticas después del partido. | Bekijk je statistieken na de wedstrijd.
          la sesión | de sessie | Empieza una sesión en la app. | Start een sessie in de app.
          el entrenamiento | de training | El entrenamiento de hoy ha sido duro. | De training van vandaag was zwaar.
          el vídeo | de video | Compara tus golpes con el vídeo del entrenador. | Vergelijk je slagen met de video van de trainer.
        `,
        phrases: `
          El sensor mide cada golpe | De sensor meet elke slag
          Los datos están en la app | De data staan in de app
          ¿Lo has probado en pista? | Heb je het op de baan getest?
          Los entrenadores ven el progreso de sus alumnos | De trainers zien de voortgang van hun leerlingen
        `,
      },
      {
        title: 'Gebruikers & groei',
        words: `
          la clasificación | het klassement | Estás tercero en la clasificación. | Je staat derde in het klassement.
          el reto | de uitdaging | Hay un reto nuevo cada semana. | Er is elke week een nieuwe uitdaging.
          el desafío | de challenge | Acepta el desafío de tu compañero. | Accepteer de challenge van je medespeler.
          subir de nivel | een level stijgen | Con cada sesión subes de nivel. | Met elke sessie stijg je een level.
          el perfil | het profiel / account | Crea tu perfil con tu correo. | Maak je profiel aan met je e-mail.
          la suscripción | het abonnement | La suscripción cuesta cinco euros al mes. | Het abonnement kost vijf euro per maand.
          el usuario | de gebruiker | Ya tenemos diez mil usuarios. | We hebben al tienduizend gebruikers.
          la actualización | de update | La nueva actualización ya está disponible. | De nieuwe update is nu beschikbaar.
        `,
        phrases: `
          Podemos integrar vuestros vídeos | We kunnen jullie video's integreren | vuestros = jullie (vosotros-vorm)
          ¿Qué os parece? | Wat vinden jullie ervan?
          Lo lanzamos en marzo | We lanceren het in maart
          Hay una versión gratuita | Er is een gratis versie
        `,
      },
    ],
  },
  {
    id: 'business',
    title: 'Zakelijk & deals',
    short: 'Zakelijk',
    icon: '🤝',
    color: '#007AFF',
    units: [
      {
        title: 'Meeting',
        words: `
          la reunión | de vergadering | ¿Podemos mover la reunión al jueves? | Kunnen we de vergadering naar donderdag verzetten?
          la propuesta | het voorstel | Te envío la propuesta mañana. | Ik stuur je het voorstel morgen.
          el acuerdo | de overeenkomst / het akkoord | Hemos llegado a un acuerdo. | We hebben een akkoord bereikt.
          el socio | de zakenpartner / vennoot | Prodigy es nuestro socio en España. | Prodigy is onze partner in Spanje.
          la empresa | het bedrijf | Nuestra empresa es holandesa. | Ons bedrijf is Nederlands.
          el plazo | de termijn | El plazo de entrega es de dos semanas. | De levertermijn is twee weken.
          la fecha límite | de deadline | ¿Cuál es la fecha límite? | Wat is de deadline?
          de acuerdo | akkoord / oké | De acuerdo, lo hacemos así. | Akkoord, zo doen we het.
        `,
        phrases: `
          ¿Puedes hablar más despacio, por favor? | Kun je langzamer praten, alsjeblieft?
          ¿Puedes repetirlo? | Kun je dat herhalen?
          Te envío la propuesta mañana | Ik stuur je het voorstel morgen
          Lo revisamos y te contestamos | We bekijken het en komen bij je terug
        `,
      },
      {
        title: 'Contract & structuur',
        words: `
          el contrato | het contract | Os mandamos el contrato esta semana. | We sturen jullie deze week het contract.
          firmar | tekenen | ¿Cuándo podemos firmar? | Wanneer kunnen we tekenen?
          el memorando de entendimiento | de intentieverklaring (MoU) | Primero firmamos un memorando de entendimiento. | Eerst tekenen we een intentieverklaring.
          la exclusividad | de exclusiviteit | Queremos exclusividad en España. | We willen exclusiviteit in Spanje.
          la sociedad | de vennootschap (S.L. ≈ bv) | Tenemos una sociedad limitada en España. | We hebben een S.L. (bv) in Spanje.
          el consejo | het bestuur (de raad) | Lo tiene que aprobar el consejo. | Het bestuur moet het goedkeuren.
          la junta | de (aandeelhouders)vergadering | La junta de accionistas es en junio. | De aandeelhoudersvergadering is in juni.
          el accionista | de aandeelhouder | Es accionista de la empresa. | Hij is aandeelhouder van het bedrijf.
        `,
        phrases: `
          ¿Cuándo podemos firmar? | Wanneer kunnen we tekenen?
          Estamos de acuerdo con este punto | We zijn het eens over dit punt
          No estamos de acuerdo | We zijn het niet eens
          Lo tengo que consultar con mi socio | Ik moet het overleggen met mijn partner
        `,
      },
      {
        title: 'Investering',
        words: `
          las acciones | de aandelen | Ofrecemos acciones a cambio. | We bieden aandelen in ruil.
          la participación | het (aandelen)belang | Quieren una participación del diez por ciento. | Ze willen een belang van tien procent.
          la valoración | de waardering | ¿Qué valoración tiene la empresa? | Wat is de waardering van het bedrijf?
          la ronda de inversión | de investeringsronde | Estamos cerrando una ronda de inversión. | We ronden een investeringsronde af.
          el inversor | de investeerder | Buscamos un inversor español. | We zoeken een Spaanse investeerder.
          los ingresos | de omzet / inkomsten | Los ingresos han crecido este año. | De omzet is dit jaar gegroeid.
          el beneficio | de winst | Este año esperamos beneficio. | Dit jaar verwachten we winst.
          el coste | de kosten | El coste por unidad es bajo. | De kosten per stuk zijn laag.
        `,
        phrases: `
          Esto no funciona para nosotros | Dit werkt niet voor ons
          ¿Qué necesitáis de nosotros? | Wat hebben jullie van ons nodig? | necesitáis = jullie hebben nodig (vosotros)
          Es nuestra última oferta | Het is ons laatste bod
          Hablamos la semana que viene | We spreken elkaar volgende week
        `,
      },
      {
        title: 'Verkoop & logistiek',
        words: `
          el precio | de prijs | ¿Cuál es el precio por unidad? | Wat is de prijs per stuk?
          el descuento | de korting | Para cien unidades hay descuento. | Bij honderd stuks is er korting.
          el pedido | de bestelling | Hemos recibido vuestro pedido. | We hebben jullie bestelling ontvangen.
          el distribuidor | de distributeur | Buscamos un distribuidor en Madrid. | We zoeken een distributeur in Madrid.
          la factura | de factuur | Te mando la factura por correo. | Ik stuur je de factuur per e-mail.
          el IVA | de btw | ¿El precio incluye IVA? | Is de prijs inclusief btw?
          el envío | de verzending | El envío tarda tres días. | De verzending duurt drie dagen.
          las ventas | de verkoop | Las ventas en España van muy bien. | De verkoop in Spanje gaat heel goed.
        `,
        phrases: `
          ¿Cuál es el precio por unidad? | Wat is de prijs per stuk?
          Os mando un correo con los detalles | Ik stuur jullie een mail met de details
          ¿Os viene bien el martes? | Komt dinsdag jullie uit?
          Necesitamos exclusividad en España | We hebben exclusiviteit in Spanje nodig
        `,
      },
    ],
  },
  {
    id: 'events',
    title: 'Evenementen & clubs',
    short: 'Events',
    icon: '🏟️',
    color: '#FF9500',
    units: [
      {
        title: 'Het evenement',
        words: `
          el evento | het evenement | El evento empieza a las diez. | Het evenement begint om tien uur.
          la inscripción | de inschrijving | La inscripción cierra el viernes. | De inschrijving sluit vrijdag.
          los jugadores | de spelers | Hay sesenta jugadores inscritos. | Er zijn zestig spelers ingeschreven.
          el patrocinador | de sponsor | Somos patrocinador del torneo. | Wij zijn sponsor van het toernooi.
          la entrada | het toegangskaartje / de ingang | ¿Dónde se compran las entradas? | Waar koop je de kaartjes?
          el ganador | de winnaar | El ganador recibe un sensor. | De winnaar krijgt een sensor.
          la fase de grupos | de groepsfase | Hemos pasado la fase de grupos. | We zijn door de groepsfase.
          el horario | het schema / de tijden | ¿Me pasas el horario de los partidos? | Stuur je me het wedstrijdschema?
        `,
        phrases: `
          ¿Cuántos jugadores hay inscritos? | Hoeveel spelers zijn er ingeschreven?
          ¿A qué hora empieza el primer partido? | Hoe laat begint de eerste wedstrijd?
          Queremos patrocinar el evento | We willen het evenement sponsoren
          Enhorabuena a los ganadores | Gefeliciteerd aan de winnaars
        `,
      },
      {
        title: 'De club',
        words: `
          el club | de club | Es el mejor club de Valencia. | Het is de beste club van Valencia.
          las instalaciones | de faciliteiten | Las instalaciones son muy nuevas. | De faciliteiten zijn heel nieuw.
          la pista cubierta | de overdekte baan | ¿Tenéis pistas cubiertas? | Hebben jullie overdekte banen?
          el gerente | de manager | Quiero hablar con el gerente del club. | Ik wil de clubmanager spreken.
          la liga | de competitie | Jugamos la liga los jueves. | We spelen de competitie op donderdag.
          el stand | de stand | Tenemos un stand en la entrada. | We hebben een stand bij de ingang.
          el sorteo | de loting | El sorteo es a las doce. | De loting is om twaalf uur.
          la cafetería | het clubcafé | Nos vemos en la cafetería del club. | We zien elkaar in het clubcafé.
        `,
        phrases: `
          ¿Cuántas pistas tiene el club? | Hoeveel banen heeft de club?
          ¿Podemos poner un stand? | Mogen we een stand neerzetten?
          Los jugadores pueden probar el sensor | De spelers kunnen de sensor uitproberen
          ¿Quién ha ganado? | Wie heeft er gewonnen?
        `,
      },
    ],
  },
  {
    id: 'travel',
    title: 'Reizen & sociaal',
    short: 'Reizen',
    icon: '✈️',
    color: '#FF2D55',
    units: [
      {
        title: 'Basis',
        words: `
          hola | hallo | Hola, soy Jerry, de PadelPlay. | Hallo, ik ben Jerry, van PadelPlay.
          buenos días | goedemorgen | Buenos días, ¿qué tal? | Goedemorgen, hoe gaat het?
          gracias | dank je | Muchas gracias por todo. | Heel erg bedankt voor alles.
          por favor | alsjeblieft | Un café, por favor. | Een koffie, alsjeblieft.
          perdón | sorry / pardon | Perdón, no te he entendido. | Sorry, ik heb je niet begrepen.
          vale | oké | Vale, nos vemos a las ocho. | Oké, we zien elkaar om acht uur.
          encantado | aangenaam | Encantado de conocerte. | Leuk je te ontmoeten.
          hasta luego | tot later | Hasta luego, ¡buen partido! | Tot later, goede wedstrijd!
        `,
        phrases: `
          Soy holandés, vivo en Holanda | Ik ben Nederlander, ik woon in Nederland
          Estoy aprendiendo español | Ik ben Spaans aan het leren
          ¿De dónde eres? | Waar kom je vandaan?
          ¿Qué tal el partido? | Hoe was de wedstrijd?
        `,
      },
      {
        title: 'Restaurant & bar',
        words: `
          la mesa | de tafel | Una mesa para cuatro, por favor. | Een tafel voor vier, alsjeblieft.
          la carta | de menukaart | ¿Nos trae la carta, por favor? | Kunt u ons de kaart brengen?
          la cuenta | de rekening | La cuenta, por favor. | De rekening, alsjeblieft.
          la caña | het biertje (van de tap) | Dos cañas, por favor. | Twee biertjes, alsjeblieft.
          el agua | het water | Una botella de agua sin gas. | Een fles water zonder prik.
          la tapa | de tapa (hapje) | Pedimos unas tapas para compartir. | We bestellen wat tapas om te delen.
          el vino tinto | de rode wijn | ¿Qué vino tinto nos recomiendas? | Welke rode wijn raad je ons aan?
          invitar | trakteren | Hoy invito yo. | Vandaag trakteer ik.
        `,
        phrases: `
          ¿Tomamos una caña? | Zullen we een biertje drinken?
          ¿Qué me recomiendas? | Wat raad je me aan?
          ¿Puedo pagar con tarjeta? | Kan ik met de kaart betalen?
          Habéis jugado muy bien | Jullie hebben heel goed gespeeld | habéis = jullie hebben (vosotros)
        `,
      },
      {
        title: 'Hotel, taxi & afspreken',
        words: `
          el hotel | het hotel | ¿Me lleva al hotel, por favor? | Kunt u me naar het hotel brengen?
          la habitación | de kamer | Tengo una habitación reservada. | Ik heb een kamer gereserveerd.
          el taxi | de taxi | Cogemos un taxi al club. | We nemen een taxi naar de club.
          el aeropuerto | het vliegveld | ¿Cuánto cuesta ir al aeropuerto? | Hoeveel kost het naar het vliegveld?
          la dirección | het adres | Te mando la dirección por WhatsApp. | Ik stuur je het adres via WhatsApp.
          coger | nemen (taxi, trein) | Voy a coger el tren a Madrid. | Ik neem de trein naar Madrid.
          quedar | afspreken | ¿Quedamos a las nueve? | Spreken we om negen uur af?
          mañana | morgen | Mañana vuelvo a Holanda. | Morgen ga ik terug naar Nederland.
        `,
        phrases: `
          ¿Me pide un taxi, por favor? | Kunt u een taxi voor me bellen?
          ¿A qué hora es el desayuno? | Hoe laat is het ontbijt?
          ¿Dónde quedamos? | Waar spreken we af?
          Lo siento, llego tarde | Sorry, ik ben te laat
        `,
      },
    ],
  },
  {
    id: 'fitness',
    title: 'Sport & fitness',
    short: 'Fitness',
    icon: '🏋️',
    color: '#34C759',
    units: [
      {
        title: 'Conditie',
        words: `
          correr | hardlopen | Mañana salgo a correr a las siete. | Morgen ga ik om zeven uur hardlopen.
          calentar | opwarmen | Primero hay que calentar bien. | Eerst moet je goed opwarmen.
          estirar | rekken | Después del partido, estira las piernas. | Rek na de wedstrijd je benen.
          cansado | moe | Estoy muy cansado después del entreno. | Ik ben erg moe na de training.
          las pulsaciones | de hartslag | Tengo las pulsaciones a ciento sesenta. | Mijn hartslag zit op honderdzestig.
          el descanso | de rust / pauze | Un minuto de descanso entre series. | Een minuut rust tussen de sets.
          la fuerza | de kracht | Hoy toca entrenar fuerza. | Vandaag staat kracht op het programma.
          la resistencia | het uithoudingsvermogen | Para Hyrox necesitas mucha resistencia. | Voor Hyrox heb je veel uithoudingsvermogen nodig.
        `,
        phrases: `
          ¿Entrenamos juntos? | Trainen we samen?
          Estoy entrenando para Hyrox | Ik train voor Hyrox
          Necesito un descanso | Ik heb een pauze nodig
          Me duele la rodilla | Mijn knie doet pijn
        `,
      },
      {
        title: 'Gym & Hyrox',
        words: `
          el gimnasio | de sportschool | Voy al gimnasio antes del trabajo. | Ik ga voor het werk naar de sportschool.
          la sentadilla | de squat | Haz tres series de sentadillas. | Doe drie sets squats.
          la serie | de set (reeks) | Me queda una serie. | Ik heb nog één set.
          las repeticiones | de herhalingen | Haz quince repeticiones. | Doe vijftien herhalingen.
          el peso | het gewicht | Sube un poco el peso. | Doe er wat gewicht bij.
          el remo | het roeien | Mil metros de remo. | Duizend meter roeien.
          el trineo | de slee (sled) | Empujar el trineo es lo más duro. | De slee duwen is het zwaarst.
          sudar | zweten | Hoy he sudado muchísimo. | Vandaag heb ik ontzettend gezweet.
        `,
        phrases: `
          ¿Cuántas series hacemos? | Hoeveel sets doen we?
          Hoy he hecho mi mejor marca | Vandaag heb ik een persoonlijk record gezet
          Vamos a calentar | We gaan opwarmen
          Estoy muerto | Ik ben kapot
        `,
      },
    ],
  },
];

/* ---------- Parser (niet aanpassen) ---------- */
function parseLines(txt) {
  return txt.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split('|').map((x) => x.trim()));
}
DOMAINS.forEach((d) => d.units.forEach((u, i) => {
  u.id = `${d.id}-${i}`;
  u.domain = d.id;
  u.words = parseLines(u.words).map(([es, nl, ex, exNl, tip]) => ({ es, nl, ex, exNl, tip, kind: 'word' }));
  u.phrases = parseLines(u.phrases || '').map(([es, nl, tip]) => ({ es, nl, tip, kind: 'phrase' }));
}));
