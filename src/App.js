import React from 'react';
import Keyboard from "react-simple-keyboard";
import copy from 'copy-to-clipboard';
import levenshtein from 'js-levenshtein';
import russian from "simple-keyboard-layouts/build/layouts/russian";
import english from "simple-keyboard-layouts/build/layouts/english";
import testSentences from "./testSentences";

import "react-simple-keyboard/build/css/index.css";
import './App.css';

import xmlDictUrl from './opencorpora.xml';

console.log(xmlDictUrl);

console.log(testSentences.length);

console.log(russian, english);

//Random shuffled alphabet using
// _.shuffle([...("а, б, в, г, д, е, ж, з, и, й, к, л, м, н, о, п, р, с, т, у, ф, х, ц, ч, ш, щ, ъ, ы, ь, э, ю, я".replace(/[^а-я]/g, ''))]).join('')
// "дющхкбзмпсръьуэийшыцжгтачнфвляое"
const layout = {
    default: [
        'д ю щ х к б    з м п с р {bksp}',
        'ъ ь у э и й    ш ы ц ж г {enter}',
        '{shift} т а ч н ф    в л я о е {shift}',
        '{space} {name} {space}'
    ],
    shift: [
        'Ф Ю В Е Ч    П М К Ц Б Г {bksp}',
        'Э У С Ъ И Я    Ш Л О Д Ж {enter}',
        '{shift} Т А Х Й     Ы Н З Р Щ Ь {shift}',
        '{space} {name} {space}'
    ].map(str => str.toLowerCase())
};

const display = {
    '{bksp}': '⌫',
    '{shift}': '⇧',
    '{enter}': 'enter',
    '{name}': ''
};

const buttonTheme = [
    {
        class: "gap",
        buttons: " "
    },
    {
        class: "gap",
        buttons: "{name}"
    }
];

function calcTyposCount(input, sentence, editsCount, buttonsCount) {
    const INF = levenshtein(input, sentence);
    const CR = input.length - INF;
    const F = editsCount;
    const IF = buttonsCount - CR - INF - F;
    return (INF + IF) / (CR + INF + IF);
}

function calcTypingRate(input, start, end) {
    return (input.length - 1) / ((end.getTime() - start.getTime()) / 1000);
}

function renderTimeInterval(start, end) {
    let time = end.getTime() - start.getTime();
    const milliseconds = time % 1000;
    time = (time - milliseconds) / 1000;
    const seconds = time % 60;
    time = (time - seconds) / 60;
    return `${time}:${seconds}.${Math.floor(milliseconds / 100)}`;
}

class App extends React.Component{
    state = ({
        testSentences: undefined,
        layoutName: "default",
        input: "",
        currentSentence: 0,
        measurements: [],
        isTyping: false,
        editsCount: 0,
        buttonsCount: 0,
        typingStart: undefined,
        interrupted: false
    });
    timer = undefined;
    prevButton = undefined;
    keyboardRef = undefined;
    lastKeyPressTime = undefined;

    componentDidMount() {
    }

    onChange = input => {
        this.setState((state) => ({
            ...state,
            input: input
        }));
    };

    onInputEnd = () => {
        clearTimeout(this.timer);
        const typingEnd = this.lastKeyPressTime;
        this.setState(({input, typingStart, measurements, currentSentence, editsCount, buttonsCount, ...state}) => {
            const sentence = testSentences[currentSentence];
            const typos = calcTyposCount(input, sentence, editsCount, buttonsCount);
            const rate = calcTypingRate(input, typingStart, typingEnd);
            return ({
                ...state,
                editsCount: 0,
                buttonsCount: 0,
                input: '',
                currentSentence: currentSentence < testSentences.length ? currentSentence + 1 : undefined,
                typingStart: undefined,
                isTyping: false,
                measurements: [...measurements, {
                    sentence,
                    input,
                    start: typingStart,
                    end: typingEnd,
                    typos,
                    rate
                }]
            });
        });
        this.keyboardRef.setInput('');
        console.log('typing end');
    };

    onKeyPress = button => {
        if (this.state.interrupted || button === '')
            return;
        this.setState((state) => {
            if (button === '{bksp}' && this.prevButton === '{bksp}') {
                this.keyboardRef.setInput('');
                setTimeout(() => {
                    this.setState({
                        interrupted: false
                    });
                }, 5000);

                return {
                    ...state,
                    editsCount: 0,
                    buttonsCount: 0,
                    input: '',
                    isTyping: false,
                    typingStart: undefined,
                    interrupted: true
                };
            } else  {
                let newState = {...state};
                if (button === "{shift}" || button === "{lock}") {
                    newState.layoutName = state.layoutName === "default" ? "shift" : "default";
                }
                if (state.typingStart === undefined) {
                    newState = {
                        ...newState,
                        typingStart: new Date(),
                        isTyping: true
                    };
                    console.log('typing start', button, newState.typingStart);
                } else {
                    console.log('type', button);
                }
                if (button === '{bksp}')
                    newState.editsCount++;
                newState.buttonsCount++;
                return newState;
            }
        });

        this.prevButton = button;
        this.lastKeyPressTime = new Date();

        // clearTimeout(this.timer);
        // const timeout = 1000 * 10;
        // this.timer = setTimeout(() => {
        //     this.onInputEnd(new Date(new Date().getTime() - timeout));
        // }, timeout);
    };

    onNextBtnClick = () => {
        if (this.state.isTyping)
            this.onInputEnd(new Date());
    };

    componentDidUpdate(prevProps, prevState, snapshot) {
        // if (this.state.input.length === testSentences[this.state.currentSentence].length) {
        //     clearTimeout(this.timer);
        //     this.onInputEnd(new Date());
        // }
    }

    copyResults = () => {
        // navigator.clipboard.writeText(JSON.stringify(this.state.measurements, null, 4));
        copy(JSON.stringify(this.state.measurements, null, 4));
    };

    saveResults = () => {
        let log = JSON.stringify(this.state.measurements, null, 4);
        let link = document.getElementById('download-link');
        if (link)
            window.URL.revokeObjectURL(link.href);
        else link = document.createElement('a');
        link.id = 'download-link';
        document.getElementById('root').appendChild(link);
        let blob = new window.Blob([log], {type: 'text/json'});
        let downloadLink = window.URL.createObjectURL(blob);
        link.download = `experiment_${new Date().toISOString()}.json`;
        link.href = downloadLink;
        let event = new window.MouseEvent('click');
        link.dispatchEvent(event);
    };

    setKeyboardRef = ref => {this.keyboardRef = ref;};

    render() {
        const {layoutName, input, measurements, currentSentence, interrupted} = this.state;
        return (
            <div className="app">
                <div className="content-container">
                    <div className={`textarea-container ${interrupted ? 'interrupted' : ''}`}>
                        <div className="text-container">{testSentences[currentSentence]}</div>
                        <textarea
                            readOnly
                            value={input}
                            placeholder={"Tap on the virtual keyboard to start"}
                        />
                    </div>
                    <div className="measurements-container">
                        {measurements.map(({rate, typos}, i) => (
                            <div className="measurement" key={i}>
                                <span className="rate">{rate.toFixed(2)}</span>{' '}
                                <span className="typos">{typos.toFixed(2)}</span>
                            </div>
                        ))}
                        {measurements.length > 0 && (
                            <div className="measurements-btns">
                                <button onClick={this.copyResults}>
                                    Copy
                                </button>
                                {' '}
                                <button onClick={this.saveResults}>
                                    Save
                                </button>
                            </div>
                        )}
                        <button className="next-btn" onClick={this.onNextBtnClick}>Next</button>
                    </div>
                </div>
                <Keyboard
                    keyboardRef={this.setKeyboardRef}
                    buttonTheme={buttonTheme}
                    display={display}
                    mergeDisplay
                    layout={layout}
                    layoutName={layoutName}
                    preventMouseDownDefault={true}
                    onChange={this.onChange}
                    onKeyPress={this.onKeyPress}
                />
            </div>
        );
    }
}

export default App;
