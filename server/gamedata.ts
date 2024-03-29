import { RiotAPITypes } from '@fightmegg/riot-api/dist/cjs/@types/index';
// import fs = require('node:fs');
// import path = require('node:path');
import * as fs from 'node:fs';
import * as path from 'node:path';

//assumes that champion.json from the most recent patch has been saved in ./resources
//example URL: https://ddragon.leagueoflegends.com/cdn/13.1.1/data/en_US/champion.json
export function getChampNames():string[] {
    let champJson = JSON.parse(fs.readFileSync(`./resources/champion.json`, {encoding: 'utf8'})); //need to update when new champ comes out -- what happens if get json with "nonexistent" champ? error?
    let champNames:string[] = [];
    for (const key in champJson.data) {
        //Inconsistency: Fiddlesticks represented as FiddleSticks in match API data
        champNames.push(key.toLowerCase()); //gives MonkeyKing -- matchdto represents MF as "MissFortune"
        //champNames.push(champJson.data[key].name); //gives Wukong
    }
    return champNames;
}

class ChampData {
    winsFor:number = 0;
    lossesFor:number = 0;
    gamesFor:number = 0;
    winrateFor:string = '';

    winsAgainst:number = 0;
    lossesAgainst:number = 0;
    gamesAgainst:number = 0;
    winrateAgainst:string = '';

    winsTotal:number = 0;
    lossesTotal:number = 0;
    gamesTotal:number = 0;
    winrateTotal:string = '';

    addWinFor() {
        this.winsFor += 1;
    }
    addLossFor() {
        this.lossesFor += 1;
    }
    addWinAgainst() {
        this.winsAgainst += 1;
    }
    addLossAgainst() {
        this.lossesAgainst += 1;
    }

    calculate() {
        this.winsTotal = this.winsFor + this.winsAgainst;
        this.lossesTotal = this.lossesFor + this.lossesAgainst;
        
        this.gamesFor = this.winsFor+this.lossesFor;
        this.gamesAgainst = this.winsAgainst+this.lossesAgainst;
        this.gamesTotal = this.winsTotal + this.lossesTotal;
        
        this.winrateFor = this.gamesFor > 0 ? (this.winsFor/this.gamesFor).toLocaleString(undefined,{style: 'percent', maximumFractionDigits:0}) : '';
        this.winrateAgainst = this.gamesAgainst > 0 ? (this.winsAgainst/this.gamesAgainst).toLocaleString(undefined,{style: 'percent', maximumFractionDigits:0}) : '';
        this.winrateTotal = this.gamesTotal > 0 ? (this.winsTotal/this.gamesTotal).toLocaleString(undefined,{style: 'percent', maximumFractionDigits:0}) : '';
    }
    static from(obj: Object):ChampData {
        return Object.assign(new ChampData(), obj);
    }
}

export class WinrateTable {
    puuid:string;
    table:{[key:string]:ChampData} = {};
    //loggedGames:Set<string> = new Set();
    //startTime:number; //update during logGame, for tracking what games to be pulled next. set initial value from last index at instantiation time?
    //endTime:number; //set initial value at instantiation time (getProfile)
    unloggedGames:string[] = [];
    constructor(puuid:string, champNames:string[]) {
        /*this.table = champNames.reduce((map:{[key:string]:ChampData}, name) => {
            map[name] = new ChampData();
            return map;
        }, {});*/
        this.puuid = puuid;

        for (const champ of champNames) {
            this.addChamp(champ);
        }
    }
    addChamp(champ:string) {
        this.table[champ] = new ChampData();
    }
    logGame(game:RiotAPITypes.MatchV5.MatchDTO) {
        const TEAMSIZE = 5;
        let id:string = game.metadata.matchId;

        /*if (this.loggedGames.has(id)) {
            console.error("ERROR - duplicate game", id);
        }
        this.loggedGames.add(id);*/

        //startTime = min(startTime, time of this game)
        //endTime = max(endTime, time of this game) -- but make sure this game won't be included in future matchId queries!

        const playerIndex = game.metadata.participants.indexOf(this.puuid);
        if (playerIndex === -1) {
            console.error(`puuid ${this.puuid} not found in game`);
        }
        else {
            //get all champs in game
            const champs:string[] = [];
            for (const participant of game.info.participants) {
                champs.push(participant.championName.toLowerCase()); //fix fiddlesticks inconsistency
            }
            
            //check if player won or lost
            const playerWon = game.info.participants[playerIndex].win;
            
            //update table
            let forIndex = playerIndex < 5 ? 0 : 5;
            let againstIndex = playerIndex < 5 ? 5 : 0;

            for (let i = forIndex; i < forIndex+TEAMSIZE; i++) {
                //console.log(champs[i]);
                playerWon ? this.table[champs[i]].addWinFor() : this.table[champs[i]].addLossFor();
            }
            for (let i = againstIndex; i < againstIndex+TEAMSIZE; i++) {
                //console.log(champs[i]);
                playerWon ? this.table[champs[i]].addLossAgainst() : this.table[champs[i]].addWinAgainst();
            }
        }
    }
    calculate() {
        for (const champ in this.table) {
            this.table[champ].calculate();
        }
    }
    static from(obj: { [key:string]: any }):WinrateTable {
        for (let champ in obj.table) {
            obj.table[champ] = ChampData.from(obj.table[champ]);
        }
        return Object.assign(new WinrateTable("", []), obj);
    }
}


/* DEBUG
let puuid = 'QFhlRvMYTzY6mo7AGbKEqSVVlQIAlenq7BcmDrCn9cNdK1vqYYvTlYiJMjGWBoe3JYA9Ljhc-klxHg';
let champNames = getChampNames();
//console.log(champNames);

let testTable = new WinrateTable(champNames, puuid);
let gamefiles = fs.readdirSync("./gamedata");
let filetype = /.*parsed/;
let gf_new = gamefiles.reduce((arr, cur) => {
    console.log(cur, !filetype.test(cur));
    if(!filetype.test(cur)) {
        arr.push(cur);
    }
    return arr;
}, [] as string[]);
console.log(gf_new);

for (const file of gf_new) {
    let g = fs.readFileSync(`./gamedata/${file}`, {encoding: 'utf8'});
    let game = JSON.parse(g) as RiotAPITypes.MatchV5.MatchDTO;
    testTable.logGame(game);
    fs.writeFileSync(`./gamedata/${path.parse(file).name}_parsed.json`, JSON.stringify(testTable.table));
}
testTable.computeTable();
*/