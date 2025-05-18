import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Dimensions, Animated } from 'react-native';
import styled from 'styled-components/native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width } = Dimensions.get('window');

// Difficulty Levels
const difficulties = {
  Easy: { rows: 8, cols: 8, bombs: 10 },
  Medium: { rows: 12, cols: 12, bombs: 20 },
  Hard: { rows: 16, cols: 16, bombs: 40 },
};

const CELL_MARGIN = 2;
const colors = {
  1: '#1976d2',
  2: '#388e3c',
  3: '#d32f2f',
  4: '#7b1fa2',
  5: '#ff8f00',
  6: '#0097a7',
  7: '#5d4037',
  8: '#616161',
};

// Styled Components
const Container = styled.View`
  flex: 1;
  background-color: #f0f2f5;
  align-items: center;
  padding-top: 50px;
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 90%;
  margin-bottom: 20px;
`;

const HeaderItem = styled.View`
  background-color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  elevation: 2;
`;

const SmileyButton = styled.TouchableOpacity`
  padding: 10px;
  background-color: #fff;
  border-radius: 30px;
  elevation: 2;
`;

const RestartButton = styled.TouchableOpacity`
  background-color: #ff9800;
  padding: 10px 20px;
  border-radius: 8px;
  elevation: 2;
`;

const Grid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  background-color: #fff;
  border-radius: 8px;
  elevation: 2;
  padding: 8px;
`;

const Cell = styled.TouchableOpacity`
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  margin: ${CELL_MARGIN}px;
`;

const DifficultyButtons = styled.View`
  flex-direction: row;
  margin-bottom: 20px;
`;

const DifficultyButton = styled.TouchableOpacity`
  margin: 0 5px;
  background-color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
  elevation: 2;
`;

export default function App() {
  const [difficulty, setDifficulty] = useState('Easy');
  const [rows, setRows] = useState(difficulties[difficulty].rows);
  const [cols, setCols] = useState(difficulties[difficulty].cols);
  const [bombCount, setBombCount] = useState(difficulties[difficulty].bombs);
  const [cellSize, setCellSize] = useState(Math.floor(width * 0.9 / difficulties[difficulty].cols) - CELL_MARGIN * 2);

  const [board, setBoard] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [flags, setFlags] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [time, setTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  const animValues = useRef([]);
  const explodeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeGame();
  }, [difficulty]);

  useEffect(() => {
    if (gameStarted && !gameOver && !win) {
      const timer = setInterval(() => setTime(t => t + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [gameStarted, gameOver, win]);

  const createBoard = (r, c, bombs) => {
    const board = Array(r).fill().map(() => Array(c).fill(0));
    let placed = 0;
    while (placed < bombs) {
      const row = Math.floor(Math.random() * r);
      const col = Math.floor(Math.random() * c);
      if (board[row][col] !== -1) {
        board[row][col] = -1;
        placed++;
      }
    }

    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        if (board[i][j] === -1) continue;
        let count = 0;
        for (let y = -1; y <= 1; y++) {
          for (let x = -1; x <= 1; x++) {
            if (i + y >= 0 && i + y < r && j + x >= 0 && j + x < c) {
              if (board[i + y][j + x] === -1) count++;
            }
          }
        }
        board[i][j] = count;
      }
    }

    return board;
  };

  const initializeGame = () => {
    const { rows, cols, bombs } = difficulties[difficulty];
    setRows(rows);
    setCols(cols);
    setBombCount(bombs);
    setCellSize(Math.floor(width * 0.9 / cols) - CELL_MARGIN * 2);

    setBoard(createBoard(rows, cols, bombs));
    setRevealed(Array(rows).fill().map(() => Array(cols).fill(false)));
    setFlags([]);
    setGameOver(false);
    setWin(false);
    setTime(0);
    setGameStarted(false);

    animValues.current = Array(rows)
      .fill()
      .map(() => Array(cols).fill(new Animated.Value(0)));
  };

  const handleCellPress = (row, col) => {
    if (!gameStarted) setGameStarted(true);
    if (gameOver || win || revealed[row][col] || flags.includes(`${row},${col}`)) return;

    if (board[row][col] === -1) {
      setRevealed(prev => {
        const newRevealed = prev.map(row => [...row]);
        newRevealed[row][col] = true;
        return newRevealed;
      });
      setGameOver(true);
      triggerExplosionAnimation();
      Alert.alert('Game Over', 'You hit a mine!');
      return;
    }

    const newRevealed = [...revealed.map(row => [...row])];
    const reveal = (r, c) => {
      if (r < 0 || r >= rows || c < 0 || c >= cols || newRevealed[r][c]) return;
      newRevealed[r][c] = true;
      if (board[r][c] === 0) {
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            reveal(r + i, c + j);
          }
        }
      }
    };

    reveal(row, col);
    setRevealed(newRevealed);
    checkWin(newRevealed);
  };

  const triggerExplosionAnimation = () => {
    Animated.stagger(50, animValues.current.flat().map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    )).start();
  };

  const triggerCelebrationAnimation = () => {
    Animated.stagger(50, animValues.current.flat().map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    )).start();
  };

  const handleLongPress = (row, col) => {
    if (gameOver || win || revealed[row][col]) return;
    const key = `${row},${col}`;
    setFlags(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const checkWin = (revealedGrid) => {
    const total = rows * cols;
    const count = revealedGrid.flat().filter(Boolean).length;
    if (total - count === bombCount) {
      setWin(true);
      triggerCelebrationAnimation();
      Alert.alert('Congratulations!', 'You won the game!');
    }
  };

  const renderCell = (row, col) => {
    const isRevealed = revealed[row][col];
    const value = board[row][col];
    const flagged = flags.includes(`${row},${col}`);
    const animationValue = animValues.current[row][col];

    return (
      <Animated.View
        key={`${row}-${col}`}
        style={{
          opacity: animationValue,
          transform: [{
            scale: animationValue.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.1],
            })
          }]
        }}
      >
        <Cell
          onPress={() => handleCellPress(row, col)}
          onLongPress={() => handleLongPress(row, col)}
          delayLongPress={2000}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: isRevealed ? '#e1e4e8' : '#a0d8ef',
          }}
          activeOpacity={0.7}
        >
          {flagged ? (
            <Icon name="flag" size={cellSize * 0.5} color="#f44336" />
          ) : isRevealed && value === -1 ? (
            <Icon name="bomb" size={cellSize * 0.5} color="#333" />
          ) : isRevealed && value > 0 ? (
            <Text style={{ color: colors[value], fontWeight: 'bold' }}>
              {value}
            </Text>
          ) : null}
        </Cell>
      </Animated.View>
    );
  };

  return (
    <Container>
      <Header>
        <HeaderItem>
          <Text style={{ fontWeight: 'bold' }}>{bombCount - flags.length}</Text>
        </HeaderItem>

        <SmileyButton onPress={initializeGame}>
          <Text style={{ fontSize: 24 }}>
            {gameOver ? '😵' : win ? '😎' : '😃'}
          </Text>
        </SmileyButton>

        <RestartButton onPress={initializeGame}>
          <Text style={{ fontSize: 16 }}>Restart</Text>
        </RestartButton>

        <HeaderItem>
          <Text style={{ fontWeight: 'bold' }}>{time}</Text>
        </HeaderItem>
      </Header>

      <DifficultyButtons>
        {Object.keys(difficulties).map(level => (
          <DifficultyButton
            key={level}
            onPress={() => setDifficulty(level)}
            style={difficulty === level ? { backgroundColor: '#ddd' } : {}}
          >
            <Text>{level}</Text>
          </DifficultyButton>
        ))}
      </DifficultyButtons>

      <Grid>
        {board.map((_, i) => (
          board[i].map((_, j) => renderCell(i, j))
        ))}
      </Grid>
    </Container>
  );
}
