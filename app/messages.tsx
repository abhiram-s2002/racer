/* global setTimeout */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  BackHandler,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Phone, ArrowLeft, Check, Clock } from 'lucide-react-native';
import { useChats } from '@/hooks/useChats';
import { useMessages } from '@/hooks/useMessages';
import { supabase } from '@/utils/supabaseClient';
import { ExtendedChat, Message } from '@/utils/chatService';
import { useLocalSearchParams } from 'expo-router';
import { validateMessage, logSecurityEvent } from '@/utils/validation';
import { advancedRateLimiter } from '@/utils/advancedRateLimiter';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import LoadMoreMessagesButton from '@/components/LoadMoreMessagesButton';

// Skeleton loader for chat list
function ChatListSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      {[...Array(5)].map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#E2E8F0', marginRight: 12, opacity: 0.6 }} />
          <View style={{ flex: 1 }}>
            <View style={{ width: '60%', height: 16, backgroundColor: '#E2E8F0', borderRadius: 8, marginBottom: 8, opacity: 0.6 }} />
            <View style={{ width: '40%', height: 12, backgroundColor: '#E2E8F0', borderRadius: 6, opacity: 0.6 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Skeleton loader for messages
function MessageSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      {[...Array(6)].map((_, i) => (
        <View key={i} style={{ alignItems: i % 2 === 0 ? 'flex-start' : 'flex-end', marginBottom: 16 }}>
          <View style={{ width: 180, height: 24, backgroundColor: '#E2E8F0', borderRadius: 12, opacity: 0.6 }} />
        </View>
      ))}
    </View>
  );
}

// Fallback avatar component
function FallbackAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initial = name && name.length > 0 ? name[0].toUpperCase() : '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#64748B', fontSize: size / 2, fontWeight: 'bold' }}>{initial}</Text>
    </View>
  );
}

// Format message time to relative format (e.g., "2m ago", "1h ago")
function formatMessageTime(timestamp: string): string {
  const now = new Date();
  const messageTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  // For older messages, show date
  return messageTime.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

// Message status indicator component (WhatsApp-style)
function MessageStatusIndicator({ status, isOwnMessage }: { status: string; isOwnMessage: boolean }) {
  if (!isOwnMessage) return null;

  switch (status) {
    case 'sending':
      return (
        <View style={styles.statusContainer}>
          <Clock size={14} color="#8696A0" />
        </View>
      );
    case 'sent':
      return (
        <View style={styles.statusContainer}>
          <Check size={14} color="#8696A0" />
        </View>
      );
    case 'delivered':
      return (
        <View style={styles.statusContainer}>
          <View style={styles.doubleCheck}>
            <Check size={13} color="#8696A0" style={styles.checkIcon} />
            <Check size={13} color="#8696A0" style={[styles.checkIcon, styles.checkIconOverlap]} />
          </View>
        </View>
      );
    case 'read':
      return (
        <View style={styles.statusContainer}>
          <View style={styles.doubleCheck}>
            <Check size={13} color="#34B7F1" style={styles.checkIcon} />
            <Check size={13} color="#34B7F1" style={[styles.checkIcon, styles.checkIconOverlap]} />
          </View>
        </View>
      );
    default:
      return null;
  }
}

function MessagesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<ExtendedChat | null>(null); // Changed type to any for now
  const [messageText, setMessageText] = useState('');
  const [username, setUsername] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // Track if we are waiting to select a chat by param
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);

  // User profiles for chat participants
  const [userProfiles, setUserProfiles] = useState<Record<string, { name: string; avatar_url: string; username: string }>>({});

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUsername(user?.user_metadata?.username ?? null);
    }
    fetchUser();
  }, []);

  const { 
    chats, 
    loading: chatsLoading, 
    error,
    refreshChats 
  } = useChats(username || '');

  const { 
    messages, 
    allMessages,
    loading: messagesLoading, 
    hasMoreMessages,
    messageLimit,
    sendMessage,
    loadMoreMessages
  } = useMessages(selectedChat?.id || null, username || '');

  // Force refresh chats when component mounts to clear cache (ONLY ONCE)
  useEffect(() => {
    if (username) {
      refreshChats(); // Force refresh to clear cache
    }
  }, [username]); // Remove refreshChats dependency to prevent loops

  const params = useLocalSearchParams();

  // Debug logging for component render
  // console.log('🔍 [MessagesScreen] Component rendered with params:', {
  //   chatId: params?.chatId,
  //   pendingChatId,
  //   username,
  //   chatsCount: chats?.length || 0, // Safe access with fallback
  //   selectedChatId: selectedChat?.id
  // });

  // Debug logging for state synchronization
  useEffect(() => {
    // console.log('🔍 [MessagesScreen] State update:', {
    //   username,
    //   chatsCount: chats?.length || 0,
    //   chatsLoading,
    //   pendingChatId,
    //   selectedChatId: selectedChat?.id,
    //   chatsArray: chats?.map(c => ({ id: c.id, participants: [c.participant_a, c.participant_b] })) || []
    // });
  }, [username, chats?.length, chatsLoading, pendingChatId, selectedChat]);

  // Helper function to get chat status color
  const getChatStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#22C55E';
      case 'completed':
        return '#10B981';
      case 'closed':
        return '#EF4444';
      default:
        return '#64748B';
    }
  };

  // When params.chatId changes, set pendingChatId
  useEffect(() => {
    if (params.chatId) {
      const chatId = params.chatId as string;
      setPendingChatId(chatId);
    }
  }, [params.chatId]);

  // When chats load, if pendingChatId is set, select the chat
  useEffect(() => {
    if (pendingChatId && chats && chats.length > 0) {
      const chat = chats.find(c => c.id === pendingChatId);
      if (chat) {
        setSelectedChat(chat);
        setPendingChatId(null);
      } else {
        // If chat not found, try to refresh the chats list (but not if already loading)
        if (!chatsLoading) {
          refreshChats();
        }
      }
    }
  }, [pendingChatId, chats, refreshChats, chatsLoading]);

  // Additional effect to handle case where chat was just created
  useEffect(() => {
    if (pendingChatId && !chatsLoading && chats && chats.length === 0) {
      // Load chats with smart limit to prevent loading too many
      // But only if we're not already loading
      if (!chatsLoading) {
        refreshChats();
      }
    }
  }, [pendingChatId, chatsLoading, chats?.length, refreshChats]);

  // Fetch user profiles for chat participants
  useEffect(() => {
    async function fetchUserProfiles() {
      if (!chats || chats.length === 0) return;
      
      const usernames = new Set<string>();
      chats.forEach(chat => {
        usernames.add(chat.participant_a);
        usernames.add(chat.participant_b);
      });
      
      if (usernames.size === 0) return;
      
      const { data, error } = await supabase
        .from('users')
        .select('username, name, avatar_url')
        .in('username', Array.from(usernames));
        
      if (!error && data) {
        const profiles: Record<string, { name: string; avatar_url: string; username: string }> = {};
        data.forEach(user => {
          profiles[user.username] = {
            name: user.name || 'Unknown User',
            avatar_url: user.avatar_url || '',
            username: user.username
          };
        });
        setUserProfiles(profiles);
      }
    }
    
    fetchUserProfiles();
  }, [chats]);

  const filteredChats = chats?.filter(chat => {
    const otherUser = chat.participant_a === username ? chat.participant_b : chat.participant_a;
    const otherUserName = userProfiles[otherUser]?.name || otherUser;
    
    const searchLower = searchQuery.toLowerCase();
    return otherUserName.toLowerCase().includes(searchLower);
  }) || [];

  // Handle back button for chat view
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backAction = () => {
      if (selectedChat) {
        setSelectedChat(null);
        return true; // Prevent default behavior
      }
      return false; // Let default behavior handle it
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [selectedChat]);

  // Handle keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // Keyboard handling if needed
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Keyboard handling if needed
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  useEffect(() => {
    if (selectedChat && messages.length > 0) {
      // Mark chat as read when opening
      // Note: This functionality is now handled by the ChatService.markAsRead
      // when messages are loaded in useMessages hook
      
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [selectedChat, messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;

    // Check rate limiting for messages
    if (username) {
      try {
        const rateLimit = await advancedRateLimiter.checkMessageRateLimit(username);
        if (!rateLimit.allowed) {
          const retrySeconds = Math.ceil((rateLimit.retryAfter || 0) / 1000);
          Alert.alert(
            'Rate Limit Exceeded', 
            `You're sending too many messages. Please try again in ${retrySeconds} seconds.`
          );
          return;
        }
      } catch (error) {
        // Silent error handling
      }
    }

    // Validate message
    const validation = validateMessage(messageText);
    if (!validation.isValid) {
      // Log security event for invalid message
      logSecurityEvent('invalid_message_attempt', { 
        message: messageText, 
        error: validation.error 
      }, username || 'unknown');
      Alert.alert('Invalid Message', validation.error);
      return;
    }
    
    try {
      await sendMessage(validation.sanitizedValue || messageText);
      
      // Log successful message
      logSecurityEvent('marketplace_message_sent', { 
        chatId: selectedChat.id 
      }, username || 'unknown');
      
      setMessageText('');
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      logSecurityEvent('marketplace_message_send_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, username || 'unknown');
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };



  const onRefresh = async () => {
    setRefreshing(true);
    await refreshChats();
    setRefreshing(false);
  };

  // Render chat item for marketplace chats
  const renderChatItem = ({ item }: { item: ExtendedChat }) => {
    // Use the new fields from database function if available, otherwise fallback to old logic
    const otherUser = item.other_participant || (item.participant_a === username ? item.participant_b : item.participant_a);
    const otherUserName = item.other_participant_name || userProfiles[otherUser]?.name || otherUser;
    const otherUserAvatar = item.other_participant_avatar || userProfiles[otherUser]?.avatar_url;
    
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => setSelectedChat(item)}
      >
        <View style={styles.chatAvatar}>
          {otherUserAvatar ? (
            <Image source={{ uri: otherUserAvatar }} style={styles.avatarImage} />
          ) : (
            <FallbackAvatar name={otherUserName} size={40} />
          )}
        </View>
        
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{otherUserName}</Text>
            <Text style={styles.chatTime}>
              {item.updated_at ? formatMessageTime(item.updated_at) : ''}
            </Text>
          </View>
          
          <View style={styles.chatPreview}>
            <Text style={styles.chatLastMessage} numberOfLines={1}>
              {item.last_message || 'No messages yet'}
            </Text>
            {/* Unread count functionality removed - will be re-implemented in Week 2 */}
          </View>
          

        </View>
      </TouchableOpacity>
    );
  };

  // Render message for marketplace chat
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_username === username;
    const senderProfile = userProfiles[item.sender_username];
    
    // Check if it's a system message (sender is 'system')
    if (item.sender_username === 'system') {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.text}</Text>
          <Text style={styles.systemMessageTime}>{formatMessageTime(item.created_at)}</Text>
        </View>
      );
    }
    
    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        {!isOwnMessage && (
          <View style={styles.messageAvatar}>
            {senderProfile?.avatar_url ? (
              <Image source={{ uri: senderProfile.avatar_url }} style={styles.messageAvatarImage} />
            ) : (
              <FallbackAvatar name={senderProfile?.name || item.sender_username} size={32} />
            )}
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
            ]}>
              {formatMessageTime(item.created_at)}
            </Text>
            <MessageStatusIndicator status={item.status || 'sent'} isOwnMessage={isOwnMessage} />
            {!isOwnMessage && (
              <Text style={styles.senderName}>
                {senderProfile?.name || item.sender_username}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Chat View
  if (selectedChat) {
    const otherUser = selectedChat.participant_a === username ? selectedChat.participant_b : selectedChat.participant_a;
    const otherUserProfile = userProfiles[otherUser];
    
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Chat Header */}
        <View style={styles.chatHeaderContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedChat(null)}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            <View style={styles.avatarContainer}>
              {otherUserProfile?.avatar_url ? (
                <Image source={{ uri: otherUserProfile.avatar_url }} style={styles.headerAvatar} />
              ) : (
                <FallbackAvatar name={otherUserProfile?.name || otherUser} size={40} />
              )}
            </View>
            <View style={styles.headerDetails}>
              <Text style={styles.headerName}>{otherUserProfile?.name || otherUser}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getChatStatusColor(selectedChat.status || 'active') + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getChatStatusColor(selectedChat.status || 'active') }
                ]}>
                  {selectedChat.status || 'active'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.chatActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Phone size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>



        {/* Messages */}
        {messagesLoading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation by sending a message!</Text>
          </View>
        ) : (
          <>
            {/* Load More Messages Button */}
            <LoadMoreMessagesButton
              onPress={loadMoreMessages}
              hasMore={hasMoreMessages}
              loading={messagesLoading}
              messageCount={messages.length}
              totalCount={allMessages?.length || 0}
            />
            
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              keyboardShouldPersistTaps="handled"
            />
          </>
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.messageInputRow}>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor="#94A3B8"
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={1000}
                ref={textInputRef}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.sendButton, messageText.trim() && styles.sendButtonActive]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Text style={[styles.sendButtonText, messageText.trim() && styles.sendButtonTextActive]}>
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Chat List View
  if (chatsLoading) {
    return <ChatListSkeleton />;
  }
  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Failed to load chats</Text>
        <Text style={styles.emptySubtext}>{error}</Text>
      </View>
    );
  }
  if (filteredChats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No conversations yet</Text>
        <Text style={styles.emptySubtext}>Start messaging by accepting pings from sellers</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#22C55E']}
            tintColor="#22C55E"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    marginLeft: 8,
  },
  chatList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  chatAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  chatTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatLastMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },

  // Chat Screen Styles
  chatHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  chatActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },

  messagesList: {
    flex: 1,
    backgroundColor: '#EFEAE2', // WhatsApp background color
  },
  messagesContainer: {
    paddingVertical: 16,
  },
  messageContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ownBubble: {
    backgroundColor: '#005C4B', // WhatsApp outgoing bubble
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1E293B',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  ownMessageTime: {
    color: '#DCFCE7',
  },
  otherMessageTime: {
    color: '#64748B',
  },
  senderName: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  systemMessageText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    textAlign: 'center',
  },
  systemMessageTime: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 0 : 0,
  },
  messageInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 120,
    justifyContent: 'center',
  },
  messageInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    maxHeight: 100,
    paddingVertical: 0,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#22C55E',
  },
  sendButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  sendButtonTextActive: {
    color: '#FFFFFF',
  },
  // Message status indicator styles
  statusContainer: {
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
  },
  doubleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: 12,
    height: 12,
  },
  checkIcon: {
    position: 'absolute',
    left: 0,
  },
  checkIconOverlap: {
    left: 4,
  },
  statusTextRead: {
    color: '#22C55E',
  },
});

export default withErrorBoundary(MessagesScreen, 'MessagesScreen');