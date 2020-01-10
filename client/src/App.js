import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { axiosWithAuth } from './util/axiosWithAuth.js';
import data from './data/test.json';

import Treasure from './components/Treasure';

import './App.scss';
import Navbar from './components/Navbar';

function App() {
  const [currentRoom, setCurrentRoom] = useState();
  const [previousRoom, setPreviousRoom] = useState();
  const [visited, setVisited] = useState(
    JSON.parse(localStorage.getItem('visited')) || {}
  );
  const [path, setPath] = useState([]);

  useEffect(() => {
    const init = () => {
      return axiosWithAuth()
        .get('adv/init/')
        .then(res => {
          setCurrentRoom(res.data);
        })
        .catch(err => console.log(err));
    };
    setVisited(JSON.parse(localStorage.getItem('visited')));
    init();
  }, []);

  useEffect(() => {
    if (currentRoom) {
      console.log('CURRENT ROOM CHANGED');
      console.log(currentRoom.room_id);
      const func = async () => {
        const objtest = {};
        const copyOfCurrentRoom = {
          ...currentRoom
        };
        const exitsObj = {};
        for (let exit of copyOfCurrentRoom.exits) {
          exitsObj[exit] = '?';
        }
        copyOfCurrentRoom.exits = exitsObj;
        objtest[currentRoom.room_id] = copyOfCurrentRoom;
        setVisited({
          ...visited,
          ...objtest
        });
      };
      func();
    }
  }, [currentRoom]);

  const directionUpdater = direction => {
    setPath([...path, direction]);
  };

  // Map Functions ===================================================================
  const modifyExitToObject = startingRoom => {
    const copyOfstartingRoom = { ...startingRoom };
    console.log(copyOfstartingRoom);
    const exitsObj = {};
    for (let exit of copyOfstartingRoom.exits) {
      exitsObj[exit] = '?';
    }
    copyOfstartingRoom.exits = exitsObj;
    return copyOfstartingRoom;
  };

  const move = async (direction, curr, visited, map) => {
    let nextRoom = findNextRoom(curr.room_id, map, direction);

    let dirObj;

    if (nextRoom) {
      dirObj = {
        direction: direction,
        next_room_id: `${nextRoom}`
      };
    } else {
      dirObj = {
        direction: direction
      };
    }

    let prev;
    let current;

    try {
      setPreviousRoom(visited[curr.room_id]);
      const res = await axiosWithAuth().post('adv/move/', dirObj);
      setCurrentRoom(res.data);
      prev = visited[curr.room_id];
      current = modifyExitToObject(res.data);
    } catch (error) {
      console.log(error);
    }
    console.log('prev: ', prev, 'current: ', current);
    return [prev, current];
  };

  const autoMove = (cd, dir, curr, visited) => {
    const time = cd * 1000;

    return new Promise(resolve => {
      setTimeout(async () => {
        const [prev, current] = await move(dir, curr, visited, data);

        resolve([prev, current]);
      }, time); // ms
    });
  };

  // Checks entire 'visited' graph for unexplored exits
  const graphIsNotComplete = map => {
    let status = false;
    for (const room in map) {
      for (const exit in map[room].exits) {
        if (map[room].exits[exit] === '?') {
          status = true;
          break;
        }
      }
    }
    return status;
  };

  // Returns array of unexplored exits of a given room
  const getUnexploredExits = room => {
    let unexplored = [];
    console.log('exits in unxplored++++++', room.exits);
    for (const exit in room.exits) {
      if (room.exits[exit] === '?') {
        unexplored.push(exit);
      }
    }
    return unexplored;
  };

  // Returns true if both booleans are true
  const checkIfBothTrue = (bool1, bool2) => {
    let status = false;
    if (bool1 === true && bool2 === true) {
      status = true;
    }
    return status;
  };

  const delay = seconds =>
    new Promise(resolver => setTimeout(() => resolver(), seconds * 1000));

  const getStatus = async () => {
    await delay(1);
    try {
      let res = await axiosWithAuth().post('adv/status/');
      console.log('status res: ', res);
      return res.data;
    } catch ({ message }) {
      console.log(message);
    }
  };

  const wiseExplorerReverse = async (direction, curr, visited) => {
    const payload = {
      direction,
      next_room_id: `${curr}`
    };
    let prev;
    let current;

    try {
      setPreviousRoom(visited[curr.room_id]);
      const res = await axiosWithAuth().post('adv/move/', payload);
      setCurrentRoom(res.data);
      prev = visited[curr.room_id];
      current = modifyExitToObject(res.data);
    } catch ({ message }) {
      console.error(message);
    }
    return [prev, current];
  };

  // Get current room from map, find out what room is on other side of the direction
  const findNextRoom = (currentRoomId, map, direction) => {
    let nextRoom;
    for (const exit in map[currentRoomId].exits) {
      if (exit === direction) {
        nextRoom = map[currentRoomId].exits[exit];
        break;
      }
    }
    return nextRoom;
  };

  // Find the direction connecting 2 rooms
  const findNextDirection = (currentRoomId, map, nextRoomId) => {
    let nextDirection;
    for (const exit in map[currentRoomId].exits) {
      if (map[currentRoomId].exits[exit] === nextRoomId) {
        nextDirection = exit;
        break;
      }
    }
    return nextDirection;
  };

  // Treasure Functions ===================================================================
  const collectTreasure = async room => {
    // Check if room
    if (
      room.items.includes(
        'shiny treasure' || 'tiny treasure' || 'small treasure'
      )
    ) {
      try {
        let status = await getStatus();
        console.log(status);
        if (status.encumbrance === status.strength) {
          return "You can't carry any more stuff right now.";
        } else {
          room.items.forEach(item => {
            const treasureObj = { name: item };
            console.log('treasureObj', treasureObj);
            takeTreasure(treasureObj);
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  const examine = async thing => {
    try {
      const res = await axiosWithAuth().post('adv/examine/', thing);
      return res.data;
    } catch (error) {
      console.log(error);
    }
  };

  const takeTreasure = treasureObj => {
    return axiosWithAuth()
      .post('adv/take/', treasureObj)
      .then(res => console.log(res))
      .catch(err => console.log(err));
  };

  const sellTreasure = treasureObj => {
    return axiosWithAuth()
      .post('adv/sell/', treasureObj)
      .then(res => console.log(res))
      .catch(err => console.log(err));
  };

  const confirmSale = treasureObj => {
    treasureObj['confirm'] = 'yes';
    return axiosWithAuth()
      .post('adv/sell/', treasureObj)
      .then(res => console.log(res))
      .catch(err => console.log(err));
  };

  const postVisited = async visitedNode => {
    try {
      await axios.post(
        'https://cs23-teamz-treasure-hunt.herokuapp.com/visited',
        visitedNode
      );
    } catch (error) {
      console.log("You've visited that area before");
    }
  };

  const updateVisited = async updates => {
    try {
      await axios.put(
        `https://cs23-teamz-treasure-hunt.herokuapp.com/visited/${updates.room_id}`,
        updates
      );
    } catch (error) {
      console.log(error);
    }
  };

  const traverseMap = async startingRoom => {
    const opposites = { n: 's', s: 'n', e: 'w', w: 'e', '?': '?' };

    //  Start in a room
    //  Add room to OUR graph with ?s for exits (100: n: ?, s: ?)
    //  Pick an unexplored exit and move to it. Also fill out exit for new room and previous room (put request). (move n to 76: s: 100, e: ?)
    //  When we hit a dead-end aka there are no more unexplored exits, we backtrack to a room with unexplored exits

    // Use a stack to hold path list to backtrack when we reach a dead-end

    /**************************************************
     * starting room
     * 1. modify exit to object
     * 2. store modified to visited
     * 3. add to stack
     * 4. choose direction
     *    - any direction no matter if '?' or dir
     *    - hardcoded(?)
     * 5. move direction
     * 6. update/track exit graph
     **************************************************/
    let prev;
    let current;
    const stack = []; // [destination, room_id of node]
    let visitedGraph = {};
    try {
      const modifiedObject = modifyExitToObject(startingRoom);
      let currObject = {};
      currObject[modifiedObject.room_id] = modifiedObject;
      setVisited({
        ...visited,
        ...currObject
      });
      localStorage.setItem('visited', JSON.stringify(visited));

      // populate graph with initial value

      visitedGraph = {
        ...visited
      };

      let dir = '?'; // hard code first direction here
      stack.push([opposites[dir], modifiedObject]);
      console.log('stored!!', stack);
      localStorage.setItem('stack', JSON.stringify(stack));

      current = modifiedObject;

      [prev, current] = await autoMove(
        current.cooldown,
        dir,
        current,
        visitedGraph
      );

      collectTreasure(current);

      // graph to visited
      const prevObj = { ...prev };
      prevObj.exits[dir] = current.room_id;
      visitedGraph[prevObj.room_id] = { ...prevObj };
      localStorage.setItem('visited', JSON.stringify(visitedGraph));

      const currObj = { ...current };
      currObj.exits[opposites[dir]] = prev.room_id;

      visitedGraph[currObj.room_id] = { ...currObj };

      localStorage.setItem('visited', JSON.stringify(visitedGraph));

      let count = 0;
      let limit = 10;
      const copyOfVisited = JSON.parse(localStorage.getItem('visited'));
      const visitedLength = Object.keys(copyOfVisited).length;
      // While 'visited' still has "?"s left unfilled...
      while (
        checkIfBothTrue(graphIsNotComplete(copyOfVisited), visitedLength < 500)
      ) {
        // If we haven't visited the currentRoom...
        if (!visitedGraph[current.room_id]) {
          // Add it to 'visited' with "?"s as exits
          console.log(current);
          visitedGraph[current.room_id] = current;
          localStorage.setItem('visited', JSON.stringify(visitedGraph));
        }

        // If currentRoom has unexplored exits, pick the first one and move to it, filling out exit info for new room and previous room (PUT)
        let visitedFromLocal = JSON.parse(localStorage.getItem('visited'));
        if (getUnexploredExits(visitedFromLocal[current.room_id]).length > 0) {
          const unexploredRoom = getUnexploredExits(
            visitedFromLocal[current.room_id]
          )[0];
          console.log('unexploredRoom: ', unexploredRoom);
          console.log(
            'unexplored exits: ',
            getUnexploredExits(visitedFromLocal[current.room_id])
          );

          const [prevFromMove, currentFromMove] = await autoMove(
            current.cooldown,
            unexploredRoom,
            current,
            visitedGraph
          );
          console.log('current: ', current);
          collectTreasure(currentFromMove);

          stack.push([opposites[unexploredRoom], currentFromMove]);
          console.log('stack inside while: ', stack);
          localStorage.setItem('stack', JSON.stringify(stack));

          prev = prevFromMove;
          current = currentFromMove;
          // graph to visited
          const prevObj = { ...prevFromMove };
          console.log('prevObj: ', prevObj, unexploredRoom, current.room_id);
          prevObj.exits[unexploredRoom] = current.room_id;

          visitedGraph[prevObj.room_id] = { ...prevObj };
          // localStorage.setItem('visited', JSON.stringify(visitedGraph));

          const currObj = { ...currentFromMove };
          console.log('current: ', currObj, unexploredRoom, prev.room_id);
          currObj.exits[opposites[unexploredRoom]] = prev.room_id;

          visitedGraph[currObj.room_id] = { ...currObj };
          console.log('visitedGraph:', visitedGraph);
          localStorage.setItem('visited', JSON.stringify(visitedGraph));
        } else {
          // TODO: backtrack using stack to last room with "?"s
          console.log('Hit a dead end! no ?s left');
          let direction = stack.pop();
          localStorage.setItem('stack', JSON.stringify(stack));
          console.log('direction in ELSE: ', direction);
          const [prevFromMove, currentFromMove] = await autoMove(
            current.cooldown,
            direction[0],
            current,
            visitedGraph
          );
          prev = prevFromMove;
          current = currentFromMove;

          // setTimeout(async () => {
          //   const [prevFromWise, currentFromWise] = await wiseExplorerReverse(
          //     stackFromLocal[stackFromLocal.length - 1][0], // destination
          //     stackFromLocal[stackFromLocal.length - 1][0], // previous node
          //     JSON.parse(localStorage.getItem('visited'))
          //   );
          //   prev = prevFromWise;
          //   current = currentFromWise;
          // }, current.cooldown * 1000);

          continue;
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="App">
      <Navbar />
      {currentRoom && (
        <div>
          {currentRoom.title}
          <br />
          <br />
          {currentRoom.room_id}
          <br />
          <br />
          {currentRoom.description}
          <br />
          <br />
          Exits: {currentRoom.exits}
          <br />
          <br />
          CD: {currentRoom.cooldown}
          <br />
          <br />
          Items:{' '}
          {currentRoom.items.length > 0
            ? currentRoom.items
            : 'No items in room'}
        </div>
      )}
      <div>
        <button
          onClick={() =>
            autoMove(currentRoom.cooldown, 'n', currentRoom, visited)
          }
        >
          N
        </button>
        <button
          onClick={() =>
            autoMove(currentRoom.cooldown, 's', currentRoom, visited)
          }
        >
          S
        </button>
        <button
          onClick={() =>
            autoMove(currentRoom.cooldown, 'e', currentRoom, visited)
          }
        >
          E
        </button>
        <button
          onClick={() =>
            autoMove(currentRoom.cooldown, 'w', currentRoom, visited)
          }
        >
          W
        </button>
      </div>
      <button onClick={() => traverseMap(currentRoom)}>TRAVERSE!</button>
      <button onClick={() => collectTreasure(currentRoom)}>
        COLLECT TREASURE!
      </button>
      <div>
        <br />
        <br />
        <Treasure
          findNextDirection={findNextDirection}
          currentRoom={currentRoom}
          directionUpdater={directionUpdater}
        />
      </div>
    </div>
  );
}

export default App;
