class SplashButton extends HTMLElement {
    /** @type {MutationObserver} */
    _observer

    constructor() {
        super();
        this._observer = new MutationObserver(this.onInnerHTMLChange.bind(this));
        this.style.display = "block";
        this.attachShadow({ mode: 'open' });
        this.rerender();
        this.addEventListener('mouseover', () => {
            const elem = this.shadowRoot.getElementById('root');
            const height = elem.offsetHeight;
            elem.style.backgroundPosition = `0 -${height}px`;
        });
        this.addEventListener('mouseout', () => {
            const elem = this.shadowRoot.getElementById('root');
            elem.style.backgroundPosition = '0 0';
        });
        this.addEventListener('resize', this.resize.bind(this));
        setTimeout(this.rerender.bind(this), 300);
    }

    resize() {
        const elem = this.shadowRoot.getElementById('root');
        elem.style.fontSize = `${elem.offsetHeight / 2}px`;
    }

    rerender() {
        console.log(this.innerHTML, this.innerText, this.outerHTML, this.outerText);
        this.shadowRoot.innerHTML = `
<style>
#root {
    font-family: Shantell Sans, system-ui;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    background: #42cbe0;
    width: 100%;
    height: 100%;
    background: url("../img/game/buttons.png") no-repeat;
    background-position: 0 0;
    
    padding: 30px 20px;
    color: white;

    box-sizing: border-box;
    line-height: 1;
    border: none;
    
    background-size: calc(100% * (1280 / 711))
                   calc(100% * (720 / 207));
    cursor: pointer;
    &:hover {
        background-position: 0 -100px;
    }
}
</style>
<button id="root">
    ${this.innerHTML}
</button>
`;
        this.resize();
    }

    connectedCallback() {
        this.rerender();
        this._observer.observe(this, {
            childList: true, // detects added/removed child elements
            subtree: true,   // observe all descendants of the element
            characterData: true, // detects text content changes
        });
    }

    disconnectedCallback() {
        this._observer.disconnect(); // Clean up observer when element is removed
    }

    onInnerHTMLChange(mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                this.rerender();
            }
        }
    }
}

class SplashServer extends HTMLElement {
    static get observedAttributes() {
        return ['name'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'name':
                this.shadowRoot.getElementById("name").innerText = newValue;
        }
    }

    constructor() {
        console.log("created");
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
<style>
    #root {
        display: flex;
        gap: 1rem;
        background: #42cbe0;
        width: 600px;
        height: 200px;
        background: url("../img/game/buttons.png") no-repeat;
        background-position: 0 0;
        
        padding: 30px 20px;
        color: white;

        box-sizing: border-box;
        font-family: Shantell Sans, system-ui;
    
        background-size: calc(100% * (1280 / 711))
                       calc(100% * (720 / 207));
    }
    #stats {
        flex-grow: 1;
        display: flex;
        gap: 0;
        flex-direction: column;
        justify-content: center;
        width: 100%;
        overflow: hidden;
        & * {
            text-overflow: ellipsis;
            overflow: hidden;
            background: transparent;
        }
    }
    #name {
        font-size: 25px;
        line-height: 1;
        min-height: 30px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        /*height: 30px;*/
    }
    #join {
        width: 100%;
        flex-grow: 1;
    }
</style>
<div id="root">
    <img src="../img/icons/128x128.png" alt="">
    <div id="stats">
        <b id="name">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusamus aliquid aut cum cupiditate dignissimos dolores ea earum enim, est eveniet, in ipsam, nam necessitatibus placeat porro rem rerum unde voluptatem!</b>
        <splash-button id="join">join</splash-button>
    </div>
</div>
        `
    }
}

customElements.define("splash-server", SplashServer);
customElements.define("splash-button", SplashButton);
console.log("t");