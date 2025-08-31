import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

interface FlowiseChatProps {
  /**
   * Position of the bubble (default: bottom-right)
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  
  /**
   * Bubble color (default: #3B81F6)
   */
  bubbleColor?: string;
  
  /**
   * Bubble size (default: 60)
   */
  bubbleSize?: number;
  
  /**
   * Chat window title
   */
  title?: string;
}

export default function FlowiseChat({
  position = 'bottom-right',
  bubbleColor = '#3B81F6',
  bubbleSize = 60,
  title = "Trợ lý AI"
}: FlowiseChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));
  const scrollViewRef = useRef<ScrollView>(null);

  // Flowise API configuration
  const API_URL = "https://api.foodmart.cloud/api/v1/prediction/494eb39c-fda4-41de-9c8e-f6a86987cd50";
  const API_KEY = "obpNP58-I1Yhs_NI94ArMcM7Ooch3KUusHQAKP1y09Y";

  const toggleChat = () => {
    // Add animation when pressed
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setIsOpen(!isOpen);
    
         // Add welcome message when opening for the first time
     if (!isOpen && messages.length === 0) {
       const welcomeMessage: Message = {
         id: 'welcome',
         text: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
         isUser: false,
         timestamp: new Date(),
       };
       setMessages([welcomeMessage]);
     }
  };

  const getPositionStyle = () => {
    const margin = 20;
    switch (position) {
      case 'bottom-left':
        return { bottom: margin, left: margin };
      case 'top-right':
        return { top: margin + 50, right: margin };
      case 'top-left':
        return { top: margin + 50, left: margin };
      default: // bottom-right
        return { bottom: margin, right: margin };
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    // Add user message
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: '',
      isUser: false,
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({
          question: userMessage.text
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Remove loading message and add bot response
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => !msg.isLoading);
                 const botMessage: Message = {
           id: (Date.now() + 2).toString(),
           text: result.text || result.answer || 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn.',
           isUser: false,
           timestamp: new Date(),
         };
        return [...filteredMessages, botMessage];
      });

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => !msg.isLoading);
                 const errorMessage: Message = {
           id: (Date.now() + 2).toString(),
           text: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.',
           isUser: false,
           timestamp: new Date(),
         };
        return [...filteredMessages, errorMessage];
      });

      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const newChat = () => {
    setMessages([{
      id: 'welcome-new',
      text: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
      isUser: false,
      timestamp: new Date(),
    }]);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message) => {
    if (message.isLoading) {
      return (
        <View key={message.id} style={[styles.messageContainer, styles.botMessage]}>
          <View style={[styles.messageBubble, styles.botBubble]}>
                         <View style={styles.loadingDots}>
               <ActivityIndicator size="small" color="#666" />
               <Text style={styles.loadingText}>AI đang suy nghĩ...</Text>
             </View>
          </View>
        </View>
      );
    }

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          message.isUser ? styles.userMessage : styles.botMessage
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            message.isUser ? styles.userBubble : styles.botBubble
          ]}
        >
          <Text
            style={[
              styles.messageText,
              message.isUser ? styles.userText : styles.botText
            ]}
          >
            {message.text}
          </Text>
          <Text
            style={[
              styles.timestamp,
              message.isUser ? styles.userTimestamp : styles.botTimestamp
            ]}
          >
            {formatTime(message.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
             {/* Floating Chat Bubble */}
       <Animated.View
         style={[
           styles.bubble,
           getPositionStyle(),
           {
             width: bubbleSize,
             height: bubbleSize,
             borderRadius: bubbleSize / 2,
             transform: [{ scale: scaleValue }],
           },
         ]}
       >
         <TouchableOpacity
           style={[styles.bubbleButton, { backgroundColor: bubbleColor }]}
           onPress={toggleChat}
           activeOpacity={0.8}
         >
           <View style={styles.bubbleIconContainer}>
             <Ionicons name="chatbubble-outline" size={24} color="white" />
           </View>
         </TouchableOpacity>
       </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
                 <KeyboardAvoidingView 
           style={styles.modalContainer}
           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
           keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
         >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <View style={styles.headerButtons}>
                             <TouchableOpacity
                 style={styles.newChatButton}
                 onPress={newChat}
               >
                 <Text style={styles.newChatButtonText}>Trò chuyện mới</Text>
               </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

                     {/* Messages */}
           <ScrollView
             ref={scrollViewRef}
             style={styles.messagesContainer}
             contentContainerStyle={styles.messagesContent}
             showsVerticalScrollIndicator={false}
             onContentSizeChange={scrollToBottom}
             keyboardShouldPersistTaps="handled"
             keyboardDismissMode="interactive"
           >
             {messages.map(renderMessage)}
           </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
                         <TextInput
               style={styles.textInput}
               value={inputText}
               onChangeText={setInputText}
               placeholder="Nhập tin nhắn của bạn..."
               multiline
               maxLength={1000}
               editable={!isLoading}
               onSubmitEditing={sendMessage}
             />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: bubbleColor },
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <FontAwesome name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    zIndex: 1000,
  },
  bubbleButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    // Gradient-like effect with multiple shadows
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bubbleIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
  },
  bubbleIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginRight: 12,
  },
  newChatButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#3B81F6',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#999',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
