module.exports = {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/.superpowers/"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|lucide-react-native|react-native-svg)",
  ],
};
