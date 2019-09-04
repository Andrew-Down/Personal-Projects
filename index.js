const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
let state = 0;
let players = [];
let roles = ["Minion", "Werewolf", "Werewolf", "Mason", "Villager", "Robber", "Mason", "Troublemaker", "Insomniac", "Drunk"];
const deck = roles;
let playerNames = [];
let nightTime = 60;
let dayTime = 480;
let masons = [];
let werewolves = [];
let swaps = [[], [], []];
let totalVotes = 0;
let voteAccelerate = 0;
let dayTimer = [];
let hunterVote = "";

const client = new Discord.Client();
client.commands = new Discord.Collection();

client.once("ready", () => {
  console.log("Ready!");
});

client.on("message", message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const commandLine = message.content.slice(prefix.length); // removed !
  const commandName = commandLine.split(" ")[0].toLowerCase();
  const args = commandLine
    .substring(commandLine.indexOf(" ") + 1)
    .toLowerCase()
    .split(","); // split arguments by ','
  // Manage global state
  switch (commandName) {
    case "ping":
      message.channel.send("Pong.");
      break;
    case "beep":
      message.channel.send("Boop.");
      break;
    case "start":
      if (state == 0) {
        message.channel.send("A werewolf game is starting! Type !join to enter the lobby");
        state = 1;
      } else {
        message.channel.send("A game has already started, I recommend joining or waiting until its finished!");
      }
      break;
    case "join":
      if (state == 1) {
        if (players.find(item => item.id === message.author.id)) {
          message.channel.send(`You have already joined this game ${message.author.username}!`);
        } else {
          message.channel.send(message.author.username + " has joined the game!");
          playerNames.push(message.author.username);
          players.push({
            username: message.author.username.toLowerCase(),
            id: message.author.id,
            role: "",
            initialRole: "",
            votes: 0,
            roleUse: false,
            voteUse: false
          });
        }
      } else if (state == 0) {
        message.channel.send("There is currently no ongoing game, type !start to begin one");
      } else {
        message.channel.send(`Sorry, a game is already in progress, please wait to join the next one`);
      }
      break;
    case "startround":
      if (ingame(message.author.id)) {
        if (state == 1) {
          state = 2;
          // Starts timer
          let nightTimer = setInterval(countdown, 1000);
          function countdown() {
            if (nightTime > 0) {
              // console.log("NIGHT TIMER RUNNING");
              nightTime = nightTime - 1;
            } else {
              // Robber swap
              if (check("Robber")) {
                if (swaps[0][0] && swaps[0][1] && swaps[0][2]) {
                  swap(swaps[0][0], swaps[0][1], swaps[0][2]);
                } else {
                  // Robber that forgot to do his job
                  swaps[0][0] = players.find(item => item.initialRole == "Robber").id;
                  swaps[0][1] = players.find(item => item.initialRole == "Robber").username;
                  swaps[0][2] = randomNot(swaps[0][0], swaps[0][0]);
                  swap(swaps[0][0], swaps[0][1], swaps[0][2]);
                  client.users
                    .get(players.find(item => item.initialRole === "Robber").id)
                    .send(
                      `You forgot to steal, so I did it for you. You stole ${swaps[0][2]}'s card and saw it was a ${
                        players.find(item => item.username == swaps[0][2].toLowerCase()).initialRole
                      }. You are now the ${players.find(item => item.username == swaps[0][2].toLowerCase()).initialRole} and ${swaps[0][2]} is now the Robber`
                    );
                }
              }
              // Troublemaker swap
              if (check("Troublemaker")) {
                if (swaps[1][0] && swaps[1][1] && swaps[1][2]) {
                  // Troublemaker that did his job
                  swap(swaps[1][0], swaps[1][1], swaps[1][2]);
                } else {
                  // Troublemaker that forgot to do his job
                  swaps[1][0] = players.find(item => item.initialRole == "Troublemaker").id;
                  swaps[1][1] = randomNot(
                    players.find(item => item.initialRole == "Troublemaker").id,
                    players.find(item => item.initialRole == "Troublemaker").id
                  );
                  // console.log("TROUBLEMKAER FIRST SWAP" + swaps[1][1]);
                  swaps[1][2] = randomNot(players.find(item => item.initialRole == "Troublemaker").id, players.find(item => item.username == swaps[1][1]).id);
                  // console.log("TROUBLEMKAER SECOND SWAPS" + swaps[1][2]);
                  swap(swaps[1][0], swaps[1][1], swaps[1][2]);
                  client.users
                    .get(players.find(item => item.initialRole === "Troublemaker").id)
                    .send(`You forgot to swap, so I did it for you. You swapped ${swaps[1][1]}'s card with ${swaps[1][2]}'s card.`);
                }
              }
              // Drunk swap
              if (check("Drunk")) {
                if (swaps[2][0]) {
                  // Actually did his job
                  drunkSwap();
                } else {
                  // Idiot forgot to swap
                  swaps[2][0] = randomNumber(roles.length);
                  drunkSwap();
                  client.users
                    .get(players.find(item => item.initialRole === "Drunk").id)
                    .send(`You forgot to swap, so I did it for you. You swapped your card with the one in the center at position ${swaps[2][0]}!`);
                }
              }
              if (players.find(item => item.initialRole === "Insomniac")) {
                client.users
                  .get(players.find(item => item.initialRole === "Insomniac").id)
                  .send(`You checked your card at the end of the night and you are the ${players.find(item => item.initialRole === "Insomniac").role}!`);
              }
              state = 3; // Updates game status to day
              message.channel.send(`Time's up, you now have ${dayTime} seconds to discuss who you think is the werewolf! Or begin deceiving the town!`);
              clearInterval(nightTimer);
              dayTimer = setInterval(dayCountdown, 1000);

              function randomNot(notId, otherId) {
                // Function that finds a random player that isn't a specific role
                let index = randomNumber(players.length - 1);
                while (players[index].id == notId || players[index].id == otherId) {
                  index = randomNumber(players.length - 1);
                }
                console.log("RANDOM NOT " + players[index].username);
                return players[index].username;
              }
              function drunkSwap() {
                // Swapping function for the drunk
                players.find(item => item.initialRole === "Drunk").role = roles[swaps[2][0]];
                roles[swaps[2][0]] = "Drunk";
              }
              function dayCountdown() {
                if (dayTime > 0) {
                  dayTime = dayTime - 1;
                } else {
                  message.channel.send(`Time's up you must now vote on who you think the werewolf is! Use the command "!vote playerName" to vote.`);
                  state = 4;
                  clearInterval(dayTimer);
                }
              }
            }
          }

          for (let i = 0; i < players.length; i++) {
            // Randomizes role and assigns it to a player and removes it from the roles array before choosing the next
            let roleNum = Math.floor(Math.random() * roles.length); // Random role
            // let roleNum = 0; // Role is based on order
            let playerRole = roles.splice(roleNum, 1);
            players[i].role = playerRole.toString();
            players[i].initialRole = playerRole.toString();
            switch (players[i].role) {
              case "Troublemaker":
                client.users
                  .get(players[i].id)
                  .send(
                    `Your role is ` +
                      players[i].role +
                      `! use the command "!switch playername1, playername2" to switch 2 players. Use "!list" to list off all the players in the game`
                  );
                break;
              case "Robber":
                client.users
                  .get(players[i].id)
                  .send(
                    `Your role is ` +
                      players[i].role +
                      `! use the command "!steal playername" to steal another player's card and look at what it was. Use "!list" to list off all the players in the game. You want to kill a werewolf.`
                  );
                break;
              case "Villager":
                client.users
                  .get(players[i].id)
                  .send(`Your role is ` + players[i].role + `! just wait until day time and help in the discussion. You want to kill a werewolf.`);
                break;
              case "Werewolf":
                werewolves.push({
                  username: players[i].username,
                  id: players[i].id,
                  initialRole: "Werewolf"
                });
                client.users
                  .get(players[i].id)
                  .send(
                    `Your role is ` +
                      players[i].role +
                      `! You will receive another message shortly about if you saw another werewolf. You want to prevent a werewolf from dying.`
                  );
                break;
              case "Insomniac":
                client.users
                  .get(players[i].id)
                  .send(
                    `Your role is ` +
                      players[i].role +
                      `! After the night phase is over you will receive a message about what your role ended up as. You want to kill a werewolf.`
                  );
                break;
              case "Minion":
                client.users
                  .get(players[i].id)
                  .send(
                    `Your role is ` +
                      players[i].role +
                      `! You will receive a message shortly about who are/is the werewolf(s). You want to prevent a werewolf from dying.`
                  );
                break;
              case "Seer":
                client.users
                  .get(players[i].id)
                  .send(
                    `Your role is ` +
                      players[i].role +
                      `! Use "!look (playername)" to look at one players card. Use "!list" to list off all the players in the game. Or use "!look #, #" and look at two of the center cards. Use "!deck" to see how many total cards are in the middle. You want to kill a werewolf.`
                  );
                break;
              case "Mason":
                masons.push({
                  username: players[i].username,
                  id: players[i].id,
                  initialRole: "Mason"
                });
                client.users
                  .get(players[i].id)
                  .send(
                    `Your role is ` +
                      players[i].role +
                      `! You will receive a message shortly about who the other mason is, or if there are no other masons. You want to kill a werewolf.`
                  );
                break;
              case "Hunter":
                client.users
                  .get(players[i].id)
                  .send(
                    `Your role is ` +
                      players[i].role +
                      `! If the town votes to kill you, whoever you vote to kill will also be killed. You want to kill a werewolf.`
                  );
              case "Tanner":
                client.users.get(players[i].id).send(`Your role is ` + players[i].role + `! Life's depressing for you, try to get yourself voted by the town.`);
                break;
              case "Drunk":
                client.users
                  .get(players[i].id)
                  .send(
                    `Your role is ` +
                      players[i].role +
                      `! Use "!swap #" to swap with a center card. Use "!deck" to see how many cards are in the center. You're not quite sure if you want to kill a werewolf or not because you forgot your role being the alcoholic you are.`
                  );
                break;
            }
            // // Mason notifications
          }

          // Notifies masons and werewolves who they saw at night
          if (masons.length > 0) {
            // If theres atleast one mason
            lockEyes(masons);
          }
          if (werewolves.length > 0 && players.find(item => item.initialRole === "Minion")) {
            // If theres atleast one werewolf and a minion is in the game
            lockEyes(werewolves);
            if (werewolves.length == 1) {
              // If there is a minion and one werewolf
              client.users.get(players.find(item => item.initialRole === "Minion").id).send(`You saw that the only werewolf is ${werewolves[0].username}!`);
            } else {
              // If there is a minion and two werewolves
              client.users
                .get(players.find(item => item.initialRole === "Minion").id)
                .send(`You saw that the werewolves are ${werewolves[0].username} and ${werewolves[1].username}!`);
            }
          } else if (players.find(item => item.initialRole === "Minion")) {
            // If theres one minion and no werewolf
            client.users.get(players.find(item => item.initialRole === "Minion").id).send(`There are no werewolves!`);
          } else if (werewolves.length > 0) {
            // If theres some werewolves but no minion
            lockEyes(werewolves);
          }
          message.channel.send(
            `The night phase is starting you have ${nightTime} seconds to input your command if you have one! Check your private messages with me to find your role, if you have to input a command for your role make sure to do it in the private chat so nobody knows your role!`
          );
          // Function for masons/werewolves to see who is on their team
          function lockEyes(arr) {
            const temp = arr;
            if (temp.length > 1) {
              client.users.get(temp[0].id).send(`During the night phase you saw that the other ${temp[0].initialRole} is ${temp[1].username}!`);
              client.users.get(temp[1].id).send(`During the night phase you saw that the other ${temp[0].initialRole} is ${temp[0].username}!`);
            } else if (arr == werewolves) {
              client.users
                .get(temp[0].id)
                .send(
                  `You are the only ${temp[0].initialRole}! You can use the command "!look (#)" with a number ranging from 1 - ${
                    roles.length
                  } to look at a center card`
                );
            } else {
              client.users.get(temp[0].id).send(`You are the only ${temp[0].initialRole}!`);
            }
          }
        } else if (state == 0) {
          message.channel.send(`You must start a game before using the command "!start"`);
        } else {
          message.channel.send(`A game is currently in progress you can't use this command!`);
        }
      }
      break;
    case "switch":
      // Switches for troublemaker
      if (ingame(message.author.id)) {
        if (verify("Troublemaker", true)) {
          if (args.length == 2) {
            if (players.find(item => item.username == args[0].trim()) && players.find(item => item.username == args[1].trim())) {
              if (args[0].trim() != message.author.username.toLowerCase() || args[1].trim() != message.author.username.toLowerCase()) {
                // Correct syntax
                players.find(item => item.username === message.author.username.toLowerCase()).roleUse = true;
                message.channel.send(`You have swapped ${args[0].trim()} with ${args[1].trim()}`);
                swaps[1] = [message.author.id, args[0].trim(), args[1].trim()];
              } else {
                // One of the names was the authors
                message.channel.send(`Sorry, you can't swap with yourself!`);
              }
            } else if (players.find(item => item.username == args[0].trim()) || players.find(item => item.username == args[1].trim())) {
              if (players.find(item => item.username == args[0].trim())) {
                // The second arg could not be found
                message.channel.send(`Sorry I couldn't find player "${args[1].trim}"`);
              } else {
                // The first arg could not be found
                message.channel.send(`Sorry I couldn't find player "${args[0].trim}"`);
              }
            } else {
              // Neither arg could be found
              message.channel.send(`Sorry I couldn't find players "${args[0].trim}" or "${args[1].trim}"`);
            }
          } else {
            // Not enough or too many args were sent
            message.channel.send("You need to send two player names");
          }
        }
      }
      break;
    case "args-info":
      // Lists off args
      if (!args.length) {
        return message.channel.send(`You didn't provide any arguments, ${message.author}!`);
      }

      message.channel.send(`Arguments: ${args}`);
      break;
    case "list":
      // Lists off players in game
      if (state > 0) {
        if (playerNames.length > 0) {
          message.channel.send(playerNames);
        } else {
          message.channel.send("Nobody is in the game yet");
        }
      } else {
        message.channel.send("Please start a game before using this command");
      }
      break;
    case "time":
      if (state == 2) {
        message.channel.send(`There is ${nightTime} seconds remaining in the night phase!`);
      } else if (state == 3) {
        message.channel.send(`There is ${dayTime} seconds remaining in the day phase!`);
      } else {
        message.channel.send(`There is no timer currently going on.`);
      }
      break;
    case "vote":
      if (ingame(message.author.id)) {
        if ((state = 4)) {
          if (players.find(item => item.username === args[0].trim())) {
            if (players.find(item => item.username === message.author.username.toLowerCase()).voteUse == false) {
              // Correctly found the player with the username
              if (players.find(item => item.username === message.author.username.toLowerCase()).role == "Hunter") {
                hunterVote = args[0].trim();
              }
              players.find(item => item.username === args[0].trim()).votes = players.find(item => item.username === args[0].trim()).votes + 1;
              players.find(item => item.username === message.author.username.toLowerCase()).voteUse = true;
              message.channel.send(`You have voted to kill ${players.find(item => item.username === args[0].trim()).username}!`);
              totalVotes = totalVotes + 1;
              if (totalVotes == players.length) {
                // This if statement decides who are the winners of the vote
                // Checks if this is the last vote
                // Calculates the winners of the vote
                state = 5;
                let maxVotes = 1;
                let voted = [];
                for (let i = 0; i < players.length; i++) {
                  // Redefines the leader in votes if they have more
                  if (players[i].votes > maxVotes) {
                    maxVotes = players[i].votes;
                    voted = [players[i].username];
                  } else if (players[i].votes == maxVotes) {
                    // Adds player to winners array if they tie the max votes
                    voted.push(players[i].username);
                  }
                }
                // Nobody dies because all players received one vote
                if (voted.length == players.length) {
                  message.channel.send(`The players have voted for nobody to be killed!`);
                } else if (voted.length == 1) {
                  // Single winner of vote
                  message.channel.send(
                    `The players have voted to kill ${voted[0]} with a total of ${maxVotes} votes! ${voted[0]} was the ${
                      players.find(item => item.username == voted[0]).role
                    }!
                    }`
                  );
                } else {
                  // Tie vote
                  let votedRoles = [];
                  for (let i = 0; i < voted.length; i++) {
                    votedRoles.push(players.find(item => item.username == voted[i]).role);
                  }
                  message.channel.send(
                    `The players have voted to kill ${voted
                      .toString()
                      .replace(/,/g, ", ")} with a total of ${maxVotes} each. These players were the ${votedRoles.toString().replace(/,/g, ", ")}, respectively`
                  );
                }
                let werewolfExist = check("Werewolf");
                let tannerExist = check("Tanner");
                let hunterExist = check("Hunter");
                let winners = [];
                if (hunterExist) {
                  if (killed("Hunter")) {
                    voted.push(hunterVote);
                  }
                }
                if (tannerExist) {
                  if (killed("Tanner")) {
                    addWinner("Tanner");
                  }
                }
                if (werewolfExist) {
                  if (killed("Werewolf")) {
                    // if werewolf was voted dead
                    townWins();
                  } else if (killed("Tanner") == false) {
                    if (check("Minion")) {
                      winners.push(getAllNames("Minion"));
                    }
                    addWinner("Werewolf");
                  }
                } else if (voted.length == players.length) {
                  townWins();
                }
                if (winners.length != 0) {
                  message.channel.send(`This game's winners are ${winners.toString().replace(/,/g, ", ")}`);
                } else {
                  message.channel.send(`There are no winners this game, you all suck!`);
                }
                function townWins() {
                  // Adds all of town to winners array
                  addWinner("Seer");
                  addWinner("Robber");
                  addWinner("Troublemaker");
                  addWinner("Drunk");
                  addWinner("Insomniac");
                  addWinner("Hunter");
                  if (check("Villager")) {
                    winners.push(getAllNames("Villager"));
                  }
                  if (check("Mason")) {
                    winners.push(getAllNames("Mason"));
                  }
                }
                function addWinner(val) {
                  if (check(val)) {
                    winners.push(players.find(item => item.role == val).username);
                  }
                }
                function getAllNames(val) {
                  var indexes = [],
                    i;
                  for (i = 0; i < players.length; i++) if (players[i].role === val) indexes.push(players[i].username);
                  return indexes;
                }
                function check(string) {
                  // function checks to see if role is in play
                  if (players.find(item => item.role === string)) {
                    return true;
                  } else {
                    return false;
                  }
                }
                function killed(string) {
                  // function checks to see if role was voted killed
                  const suspectName = getAllNames(string);
                  if (voted.find(item => item == suspectName[0] || suspectName[1])) {
                    return true;
                  } else {
                    return false;
                  }
                }
              }
            } else {
              // Author tries to vote twice
              message.channel.send(`You have already voted!`);
            }
          } else {
            // Author uses invalid username
            message.channel.send(`I'm sorry I couldn't find the player ${args[0].trim()}, please use !list to look at a list of players in the game`);
          }
        }
      }

      break;
    case "cards":
      message.channel.send(`Here are the roles in this current deck: ${deck.toString()}`);
      break;
    case "steal": // Command for robber to steal
      if (ingame(message.author.id)) {
        if (verify("Robber", true)) {
          if (args.length == 1) {
            if (players.find(item => item.username === args[0].trim()) && message.author.username.toLowerCase() != args[0].trim()) {
              players.find(item => item.username === message.author.username.toLowerCase()).roleUse = true;
              message.channel.send(
                `You are now the ${players.find(item => item.username === args[0].trim()).initialRole} and ${args[0].trim()} is now the Robber`
              );
              swaps[0] = [message.author.id, message.author.username.toLowerCase(), args[0].trim()];
            } else if (message.author.username.toLowerCase() != args[0].trim()) {
              message.channel.send(`Sorry I could not find the player ${args[0].trim()}, please use !list for a list of players in this game.`);
            } else {
              message.channel.send(`Sorry, you can't swap with yourself.`);
            }
          } else {
            message.channel.send("You need to send only one player name");
          }
        }
      }
      break;
    case "voteaccelerate":
      if (ingame(message.author.id)) {
        if (state == 3) {
          voteAccelerate = voteAccelerate + 1;
          if (voteAccelerate == players.length) {
            message.channel.send(
              `The vote has been accelerated you must now vote on who you think the werewolf is! Use the command "!vote playerName" to vote.`
            );
            state = 4;
            clearInterval(dayTimer);
          } else {
            message.channel.send(`${message.author.username} has voted to accelerate the vote! (${voteAccelerate}/${players.length})`);
          }
        }
      }
      break;

    case "roles":
      if (state == 0 || 1) {
        message.channel.send(`Here are the roles in this current deck: ${deck.toString()}`);
      }
      break;
    case "deck":
      message.channel.send(`There are ${roles.length} cards in the center`);
      break;
    case "players":
      console.log(players);
      break;
    case "swap":
      if (ingame(message.author.id)) {
        if (verify("Drunk", true) == true) {
          if (args.length == 1 && args[0] <= roles.length) {
            // Correct syntax Drunk
            // Store it in swaps
            players.find(item => item.username === message.author.username.toLowerCase()).roleUse = true;
            swaps[2][0] = [args[0] - 1];
            message.channel.send(`Your role is now the card from position ${args[0]}`);
          } else {
            message.channel.send(`Make sure you only input one number and that it is within the range of 1 - ${roles.length}`);
          }
        }
      }
      break;
    case "flip":
      if (ingame(message.author.id)) {
        if (state == 5) {
          message.channel.send(`Username, Role`);
          for (let i = 0; i < players.length; i++) {
            message.channel.send(`${players[i].username}, ${players[i].role}`);
          }
        } else {
          message.channel.send(`This command can only be used at the end of a game!`);
        }
      }
      break;
    case "look":
      if (ingame(message.author.id)) {
        if (verify("Seer", false) || (verify("Werewolf", false) && werewolves.length == 1)) {
          if (args.length == 1) {
            // 1 Argument only
            if (players.find(item => item.username === args[0].trim()) && verify("Seer", false)) {
              // Seer looking at player
              players.find(item => item.username === message.author.username.toLowerCase()).roleUse = true;
              message.channel.send(
                `You looked at ${args[0].trim()}'s card and saw that their role is ${players.find(item => item.username === args[0].trim()).initialRole}`
              );
            } else if (verify("Werewolf", false) && args[0] <= roles.length) {
              // Lone Werewolf
              players.find(item => item.username === message.author.username.toLowerCase()).roleUse = true;
              message.channel.send(`You looked at the card in position ${args[0]} and saw that it was a ${roles[args[0] - 1]}`);
            } else if (verify("Seer", false)) {
              // Seer that used wrong syntax
              message.channel.send(
                `Sorry, I couldn't find the player ${
                  args[0].trim
                }, use !list to list off the player names in the game. Alternatively, if you meant to look at two of the center cards make sure you didn't forget the comma!`
              );
            } else {
              // Lone werewolf using wrong syntax
              message.channel.send(`Sorry, please make sure you are using a number in the range of 1 - ${roles.length}.`);
            }
          } else if (args.length == 2 && args[0] != args[1] && args[0] <= roles.length && args[1] <= roles.length && args[0] >= 1 && args[1] >= 1) {
            // Seer looking at two center cards
            players.find(item => item.username === message.author.username.toLowerCase()).roleUse = true;
            message.channel.send(`You saw ${roles[args[0] - 1]} in position ${args[0].trim()}, and saw ${roles[args[1] - 1]} in position ${args[1].trim()}`);
          } else {
            // Seer looking at center cards with bad syntax
            message.channel.send(`Make sure both numbers fall within the range of 1 - ${roles.length}`);
          }
        } else {
          message.channel.send(`You are not a lone Werewolf/Seer, you can't use this command`);
        }
      }
      break;

      function check(singleRole) {
        if (players.find(item => item.initialRole === singleRole)) {
          return true;
        } else {
          return false;
        }
      }
      function verify(singleRole, sendMessage) {
        if (players.find(item => item.id === message.author.id).initialRole == singleRole) {
          if (players.find(item => item.id === message.author.id).roleUse == false) {
            if (state == 2) {
              return true;
            } else if (sendMessage) {
              message.channel.send(`It is no longer the night phase you may not use this command!`);
            }
          } else if (sendMessage) {
            message.channel.send(`You have already used your command this game!`);
          }
        } else if (sendMessage) {
          message.channel.send(`You are not the ${singleRole}, you can't use this command!`);
        }
        return false;
      }
      function ingame(id) {
        if (players.find(item => item.id === message.author.id)) {
          return true;
        } else {
          message.channel.send(`You must be joined into the game to use this command!`);
        }
      }

      function swap(authorID, player1username, player2username) {
        // Checks if both players exist
        const player0 = players.find(item => item.username === player1username);
        const player1 = players.find(item => item.username === player2username);
        if (player0 && player1) {
          // Swaps the 2 roles
          const tempRole = player0.role;
          player0.role = player1.role;
          player1.role = tempRole;
        }
      }
  }
});
function randomNumber(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
client.login(token);

// TO - DO
// Notify Seer, Lone werewolf, and drunk how many cards are in the middle after all roles have been assigned
// Status 0 = game not started, 1 game joining phase, 2 night phase, 3 day phase, 4 voting phase, 5 game over
// add restart
// Allow players to assign roles of claims
// Mute players during night phase and voting phase

// COMPLETED roles
// Villager, Mason, Werewolf, Minion, Seer, Robber, Troublemaker, Drunk, Insomniac, Hunter, Tanner
// IN PROGRESS
//
// PLAN
// Store the swap inside of an array where index 0 is robber 1 is troublemaker 2 is drunk
// After game time has expired execute all the swapping in order
// NOT STARTED
// Doppelganger

// Robber, Troublemaker, and Drunk issues
